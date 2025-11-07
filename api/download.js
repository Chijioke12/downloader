import axios from 'axios';
import mime from 'mime-types';

export default {
  async fetch(request) {
    // Handle CORS
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Range',
      'Access-Control-Expose-Headers': 'Content-Range, Accept-Ranges, Content-Length, Content-Type'
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 200, headers: corsHeaders });
    }

    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    try {
      const body = await request.json();
      const { url, download = false, filename } = body;

      if (!url) {
        return new Response(JSON.stringify({ error: 'URL is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Validate URL
      new URL(url);
      
      // First, get headers to check file info
      const headResponse = await axios.head(url, {
        timeout: 30000,
        maxRedirects: 5,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      }).catch(() => null);

      const contentType = headResponse?.headers['content-type'] || '';
      const contentLength = headResponse?.headers['content-length'] || '0';
      const fileSize = parseInt(contentLength);

      // Determine if it's a media file
      const isMediaFile = contentType.startsWith('audio/') || 
                         contentType.startsWith('video/') || 
                         contentType.startsWith('image/') ||
                         /\.(mp3|mp4|avi|mov|wav|flac|aac|webm|mkv|m4a|ogg|pdf|doc|docx|zip|rar)$/i.test(url);

      if (download && isMediaFile) {
        // Stream the file for download
        const response = await axios({
          method: 'GET',
          url,
          responseType: 'stream',
          timeout: 300000, // 5 minutes
          maxRedirects: 5,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            ...(request.headers.get('range') && { 'Range': request.headers.get('range') })
          }
        });

        // Set appropriate headers for file download
        const extension = mime.extension(contentType) || url.split('.').pop() || 'bin';
        const downloadFilename = filename || `download.${extension}`;
        
        const responseHeaders = {
          ...corsHeaders,
          'Content-Type': contentType || 'application/octet-stream',
          'Content-Disposition': `attachment; filename="${downloadFilename}"`,
          'Accept-Ranges': 'bytes'
        };
        
        if (response.headers['content-range']) {
          responseHeaders['Content-Range'] = response.headers['content-range'];
        }
        
        if (response.headers['content-length']) {
          responseHeaders['Content-Length'] = response.headers['content-length'];
        }

        // Convert stream to ReadableStream for Response
        const readableStream = new ReadableStream({
          start(controller) {
            response.data.on('data', (chunk) => {
              controller.enqueue(new Uint8Array(chunk));
            });
            
            response.data.on('end', () => {
              controller.close();
            });
            
            response.data.on('error', (error) => {
              controller.error(error);
            });
          }
        });

        const status = response.headers['content-range'] ? 206 : 200;
        return new Response(readableStream, { status, headers: responseHeaders });

      } else {
        // Return file information
        return new Response(JSON.stringify({
          success: true,
          data: {
            url,
            contentType,
            fileSize,
            fileSizeFormatted: formatFileSize(fileSize),
            isMediaFile,
            downloadSupported: isMediaFile,
            headers: headResponse?.headers || {},
            timestamp: new Date().toISOString()
          }
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

    } catch (error) {
      console.error('Error processing download:', error.message);
      
      let errorMessage = 'Failed to process download request';
      let statusCode = 500;
      
      if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        errorMessage = 'Invalid URL or resource not accessible';
        statusCode = 400;
      } else if (error.response?.status) {
        errorMessage = `HTTP ${error.response.status}: ${error.response.statusText}`;
        statusCode = error.response.status;
      }
      
      return new Response(JSON.stringify({ error: errorMessage }), {
        status: statusCode,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
};

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}