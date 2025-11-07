import axios from 'axios';
import * as cheerio from 'cheerio';
import mime from 'mime-types';

export default {
  async fetch(request) {
    // Handle CORS
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
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
      const { url, format = 'text', includeMetadata = true } = body;

      if (!url) {
        return new Response(JSON.stringify({ error: 'URL is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Validate URL
      new URL(url);
      
      const response = await axios.get(url, {
        timeout: 30000,
        maxRedirects: 5,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      const contentType = response.headers['content-type'] || '';
      const contentLength = response.headers['content-length'] || '0';
      
      // Handle different content types
      if (contentType.includes('application/json')) {
        return new Response(JSON.stringify({
          success: true,
          data: {
            url,
            content: typeof response.data === 'string' ? response.data : JSON.stringify(response.data, null, 2),
            contentType: 'application/json',
            format: 'json',
            size: JSON.stringify(response.data).length,
            timestamp: new Date().toISOString()
          }
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      if (contentType.includes('text/html')) {
        const $ = cheerio.load(response.data);
        
        // Enhanced metadata extraction
        const metadata = includeMetadata ? {
          title: $('title').text().trim() || $('h1').first().text().trim(),
          description: $('meta[name="description"]').attr('content') || 
                      $('meta[property="og:description"]').attr('content') || '',
          author: $('meta[name="author"]').attr('content') || 
                 $('meta[property="article:author"]').attr('content') || '',
          publishedDate: $('meta[property="article:published_time"]').attr('content') || 
                        $('time[datetime]').attr('datetime') || '',
          keywords: $('meta[name="keywords"]').attr('content') || '',
          ogImage: $('meta[property="og:image"]').attr('content') || '',
          canonicalUrl: $('link[rel="canonical"]').attr('href') || url,
          lang: $('html').attr('lang') || 'en'
        } : {};
        
        // Remove unwanted elements
        $('script, style, nav, header, footer, aside, .advertisement, .ads, .social-share').remove();
        
        let content;
        if (format === 'markdown') {
          content = convertHtmlToMarkdown($('body').html() || response.data);
        } else if (format === 'html') {
          content = $('body').html() || response.data;
        } else {
          // Extract clean text
          content = $('body').text().replace(/\s+/g, ' ').trim();
        }

        return new Response(JSON.stringify({
          success: true,
          data: {
            url,
            content,
            metadata,
            contentType: 'text/html',
            format,
            size: content.length,
            timestamp: new Date().toISOString()
          }
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } 
      
      if (contentType.includes('text/')) {
        // Handle plain text, CSV, etc.
        return new Response(JSON.stringify({
          success: true,
          data: {
            url,
            content: response.data,
            contentType,
            format: 'text',
            size: response.data.length,
            timestamp: new Date().toISOString()
          }
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      // For binary files, return metadata only
      const fileSize = parseInt(contentLength);
      return new Response(JSON.stringify({
        success: true,
        data: {
          url,
          contentType,
          fileSize,
          fileSizeFormatted: formatFileSize(fileSize),
          isBinary: true,
          downloadEndpoint: '/api/download',
          format: 'binary',
          timestamp: new Date().toISOString()
        }
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('Error fetching URL:', error.message);
      
      let errorMessage = 'Failed to fetch content from URL';
      let statusCode = 500;
      
      if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        errorMessage = 'Invalid URL or website not accessible';
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

function convertHtmlToMarkdown(html) {
  let markdown = html;
  
  // Headers
  markdown = markdown.replace(/<h([1-6])[^>]*>(.*?)<\/h[1-6]>/gi, (match, level, content) => {
    const hashes = '#'.repeat(parseInt(level));
    return `\n${hashes} ${content.replace(/<[^>]*>/g, '')}\n`;
  });
  
  // Code blocks
  markdown = markdown.replace(/<pre[^>]*><code[^>]*>(.*?)<\/code><\/pre>/gis, '\n```\n$1\n```\n');
  markdown = markdown.replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`');
  
  // Blockquotes
  markdown = markdown.replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gis, '\n> $1\n');
  
  // Paragraphs
  markdown = markdown.replace(/<p[^>]*>(.*?)<\/p>/gi, '\n$1\n');
  
  // Bold and italic
  markdown = markdown.replace(/<(strong|b)[^>]*>(.*?)<\/(strong|b)>/gi, '**$2**');
  markdown = markdown.replace(/<(em|i)[^>]*>(.*?)<\/(em|i)>/gi, '*$2*');
  
  // Links
  markdown = markdown.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)');
  
  // Images
  markdown = markdown.replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*>/gi, '![$2]($1)');
  markdown = markdown.replace(/<img[^>]*src="([^"]*)"[^>]*>/gi, '![]($1)');
  
  // Lists
  markdown = markdown.replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n');
  markdown = markdown.replace(/<\/?[uo]l[^>]*>/gi, '\n');
  
  // Tables
  markdown = markdown.replace(/<table[^>]*>(.*?)<\/table>/gis, (match, content) => {
    return '\n' + content.replace(/<tr[^>]*>(.*?)<\/tr>/gi, (row, cells) => {
      return cells.replace(/<t[hd][^>]*>(.*?)<\/t[hd]>/gi, '| $1 ') + '|\n';
    }) + '\n';
  });
  
  // Line breaks
  markdown = markdown.replace(/<br[^>]*\/?>/gi, '\n');
  
  // Remove remaining HTML tags
  markdown = markdown.replace(/<[^>]*>/g, '');
  
  // Clean up whitespace
  markdown = markdown.replace(/\n\s*\n\s*\n/g, '\n\n');
  markdown = markdown.replace(/^\s+|\s+$/g, '');
  
  return markdown;
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}