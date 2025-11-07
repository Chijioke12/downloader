export default {
  async fetch(request) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 200, headers: corsHeaders });
    }

    if (request.method !== 'GET') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      name: 'Universal Content Downloader',
      version: '2.0.0',
      nodeVersion: '22.x',
      endpoints: {
        convert: '/api/convert',
        download: '/api/download',
        info: '/api/info'
      },
      supportedFormats: {
        text: ['text/html', 'text/plain', 'text/csv', 'application/json'],
        media: ['audio/*', 'video/*', 'image/*'],
        documents: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
      },
      features: [
        'Text content extraction',
        'HTML to Markdown conversion',
        'Media file downloading (MP3, MP4, etc.)',
        'Large file support with streaming',
        'Metadata extraction',
        'Multiple output formats',
        'Web Standard fetch API support'
      ],
      maxFileSize: 'No limit (streaming supported)',
      timeout: '300 seconds',
      runtime: 'Node.js 22.x with Web Standards',
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
};