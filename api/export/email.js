/**
 * Vercel Serverless Function for Email Export
 * POST /api/export/email
 */

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { data, recipientEmail = 'simmonspatrick1@gmail.com' } = req.body;

    if (!data) {
      return res.status(400).json({ error: 'data required' });
    }

    // Import email export utilities dynamically
    const emailUtils = await import('../../email-export-utils.js');
    const { formatDataWithHashtags, createEmailSubject, prepareEmailContent } = emailUtils;

    const emailContent = prepareEmailContent(data, { 
      recipientEmail,
      includeInstructions: true 
    });

    console.log(`Email export prepared for ${recipientEmail}`);

    res.json({
      success: true,
      message: 'Email content prepared',
      emailContent: {
        to: emailContent.to,
        subject: emailContent.subject,
        body: emailContent.body
      },
      mailtoUrl: `mailto:${emailContent.to}?subject=${encodeURIComponent(emailContent.subject)}&body=${encodeURIComponent(emailContent.body)}`
    });
  } catch (error) {
    console.error('Error preparing email export:', error.message);
    res.status(500).json({ 
      error: 'Failed to prepare email export',
      details: error.message 
    });
  }
}

