import * as cheerio from 'cheerio';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { type, content, apiKey, projectData, customerData, tasks } = req.body;
  
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
            "website": "${content}",
            "description": "Brief 1-2 sentence description",
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
    } else if (type === 'suggest_tasks') {
      const industry = customerData?.industry || projectData?.industry || 'Professional Services';
      const projectName = projectData?.name || projectData?.projectName || 'New Project';
      const projectType = projectData?.billingType || 'Charge-Based';
      const budget = projectData?.budget || customerData?.annualRevenue || 100000;
      
      prompt = `
        You are a NetSuite PSA expert. Generate a detailed task breakdown for a project.

        Project Details:
        - Name: ${projectName}
        - Type: ${projectType}
        - Industry: ${industry}
        - Budget: $${budget}

        Generate a JSON array of tasks with the following structure:
        [
          {
            "name": "Task name (e.g., Discovery & Design)",
            "estimatedHours": 40,
            "plannedWork": 40,
            "status": "Not Started",
            "resource": "912|913|914|915|916",
            "serviceItem": "Service item name from NetSuite",
            "billingClass": "1|2|3|4",
            "unitCost": 150
          }
        ]

        Resource IDs (use these exact IDs):
        - 912: Business Analyst
        - 913: Consultant
        - 914: Project Manager
        - 915: Technical Consultant
        - 916: Trainer

        Billing Classes:
        - 1: Professional Services
        - 2: Consulting
        - 3: Development
        - 4: Training

        Service Items (use realistic NetSuite service items):
        - PS - Discovery & Design Strategy
        - PS - Training Services
        - SVC_PR_Development
        - SVC_PR_Consulting
        - SVC_PR_Project Management
        - PS - Data Migration
        - PS - Go-Live Support
        - PS - Post Go-Live Support

        Guidelines:
        - Create 3-6 tasks appropriate for ${industry} industry
        - Match resource types to task complexity
        - Use industry-standard hourly rates ($${Math.round(budget / 200)}-$${Math.round(budget / 100)} range)
        - Ensure total hours align with project budget
        - Make tasks realistic and sequential

        Return ONLY the JSON array, no other text.
      `;
    } else if (type === 'generate_estimate') {
      const customerName = customerData?.name || 'Customer';
      const projectName = projectData?.name || 'Project';
      const customerBudget = customerData?.annualRevenue || 100000;
      const taskList = tasks || [];
      
      prompt = `
        You are a NetSuite sales engineer. Generate an estimate/quote from project tasks.

        Customer: ${customerName}
        Project: ${projectName}
        Customer Budget: $${customerBudget}
        
        Tasks:
        ${JSON.stringify(taskList, null, 2)}

        Generate a JSON object with estimate line items:
        {
          "items": [
            {
              "name": "Service item name",
              "quantity": 1,
              "rate": 150,
              "description": "Brief description"
            }
          ],
          "total": 0,
          "recommendations": "Brief notes on pricing strategy"
        }

        Guidelines:
        - Convert tasks to estimate line items
        - Use task unitCost * estimatedHours for item rates
        - Group similar tasks into single line items when appropriate
        - Ensure total is within customer budget constraints
        - Apply industry-standard markups (15-25%)
        - Use realistic NetSuite service item names

        Return ONLY the JSON object, no other text.
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
    if (type === 'analyze_url' || type === 'suggest_tasks' || type === 'generate_estimate') {
      try {
        // Try to find JSON array or object
        const jsonMatch = completion.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          res.status(200).json(parsed);
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

