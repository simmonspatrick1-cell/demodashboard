import * as cheerio from 'cheerio';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { type, content, apiKey } = req.body;
  
  // Use environment variable if apiKey is not provided, empty, or looks invalid
  // Only accept frontend key if it starts with 'sk-ant-'
  let finalApiKey = process.env.ANTHROPIC_API_KEY;
  
  if (apiKey && typeof apiKey === 'string' && apiKey.trim().startsWith('sk-ant-')) {
      finalApiKey = apiKey.trim();
  }

  if (!finalApiKey) {
    return res.status(400).json({ error: 'Claude API Key is required (in settings or env vars)' });
  }

  try {
    let prompt = '';
    let systemPrompt = 'You are an expert NetSuite solution architect and sales engineer.';

    if (type === 'analyze_url') {
      // 1. Fetch and Parse URL
      try {
        const response = await fetch(content);
        const html = await response.text();
        const $ = cheerio.load(html);
        
        // Extract relevant text (remove scripts, styles)
        $('script, style').remove();
        const text = $('body').text().replace(/\s+/g, ' ').trim().substring(0, 15000); // Limit context window

        prompt = `
          Analyze the following website content for a company:
          
          "${text}"

          Based on this content, generate a JSON object with the following structure:
          {
            "name": "Company Name",
            "entityId": "Short alphanumeric ID (e.g. COMP-001)",
            "type": "Company or Individual",
            "status": "Qualified, Active, Hot, Proposal, or Customer-Closed Won",
            "salesRep": "A plausible sales rep name",
            "leadSource": "Source (e.g., Web, Referral, Event)",
            "subsidiary": "Subsidiary or parent company (optional)",
            "industry": "Industry (e.g., SaaS, Manufacturing)",
            "size": "Estimated Employee Count (e.g., 50-100)",
            "budget": "Estimated revenue or budget range (e.g., $10M-20M)",
            "revenue": "Estimated Revenue (optional, can mirror budget)",
            "website": "${content}",
            "description": "Brief 1-2 sentence description",
            "focus_areas": ["Area 1", "Area 2", "Area 3"],
            "phone": "Sales or general phone number",
            "email": "Company email",
            "invoiceEmail": "Preferred invoice email (use ap@netsuite.com if unsure)",
            "paymentEmail": "Payment notification email (use ap@netsuite.com if unsure)",
            "suggested_projects": [
              { "name": "Project Name", "description": "Why this project fits" }
            ]
          }
          
          Only return the valid JSON object, no other text. If you don't have enough data, make a realistic guess; default invoiceEmail/paymentEmail to ap@netsuite.com when uncertain.
        `;
      } catch (error) {
        return res.status(500).json({ error: `Failed to fetch URL: ${error.message}` });
      }

    } else if (type === 'summarize_clipboard') {
      prompt = `
        Summarize the following list of prompts or notes into a cohesive strategy document. 
        Identify common themes, key requirements, and suggested next steps.

        Input:
        ${content}

        Output Format:
        ## Executive Summary
        ...
        ## Key Requirements
        ...
        ## Recommended Strategy
        ...
      `;
    } else {
      return res.status(400).json({ error: 'Invalid request type' });
    }

    // 2. Call Claude API
    let anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': finalApiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
        'dangerously-allow-browser': 'true'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    let data = await anthropicResponse.json();

    // 2a. Retry Logic: If 401 Unauthorized AND we used a custom key, try again with system key
    if (data.error && data.error.type === 'authentication_error' && finalApiKey !== process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY) {
      console.log('Authentication failed with custom key. Retrying with system key...');
      anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
          'dangerously-allow-browser': 'true'
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 4096,
          system: systemPrompt,
          messages: [{ role: 'user', content: prompt }]
        })
      });
      data = await anthropicResponse.json();
    }

    if (data.error) {
      throw new Error(data.error.message);
    }

    // 3. Process Response
    const completion = data.content[0].text;

    // If looking for JSON, try to extract it if Claude added extra text
    if (type === 'analyze_url') {
      try {
        const jsonMatch = completion.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          res.status(200).json(JSON.parse(jsonMatch[0]));
        } else {
          res.status(200).json({ error: 'Could not parse JSON from Claude response', raw: completion });
        }
      } catch (e) {
        res.status(200).json({ error: 'Invalid JSON format', raw: completion });
      }
    } else {
      res.status(200).json({ summary: completion });
    }

  } catch (error) {
    console.error('AI Generation Error:', error);
    res.status(500).json({ error: error.message });
  }
}

