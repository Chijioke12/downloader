# Universal Content Downloader

A Vercel-deployable server that can download and convert any web content including media files (MP3, MP4, etc.) of any size using Node.js 22.x runtime.

## Features

- 🎵 Download media files (MP3, MP4, AVI, MOV, WAV, FLAC, AAC, WebM, MKV)
- 📄 Convert web content to text, Markdown, or HTML
- 📊 Extract metadata from web pages
- 🚀 Support for large files with streaming
- 🌐 CORS enabled for web app integration
- ⚡ Built with modern Web Standards (fetch API)
- 🔧 Node.js 22.x runtime support

## Quick Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

## Local Development

1. Install dependencies:
```bash
npm install
```

2. Start development server:
```bash
vercel dev
```

## API Endpoints

### Convert Web Content
```bash
POST /api/convert
Content-Type: application/json

{
  "url": "https://example.com/article",
  "format": "markdown", // "text", "markdown", "html"
  "includeMetadata": true
}
```

### Download Media Files
```bash
POST /api/download
Content-Type: application/json

{
  "url": "https://example.com/song.mp3",
  "download": true,
  "filename": "my-song.mp3" // optional
}
```

### Server Information
```bash
GET /api/info
```

## Environment Requirements

- Node.js 22.x (as required by Vercel)
- Vercel Functions with Web Standards support

## Deployment

1. Clone this repository
2. Install dependencies: `npm install`
3. Deploy to Vercel: `vercel --prod`

## Usage Examples

### Convert a webpage to Markdown:
```javascript
const response = await fetch('https://your-app.vercel.app/api/convert', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    url: 'https://example.com/article',
    format: 'markdown'
  })
});

const data = await response.json();
console.log(data.data.content);
```

### Download a media file:
```javascript
const response = await fetch('https://your-app.vercel.app/api/download', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    url: 'https://example.com/video.mp4',
    download: true
  })
});

// Response will be the file stream
const blob = await response.blob();
```

## Supported File Types

- **Audio**: MP3, WAV, FLAC, AAC, M4A, OGG
- **Video**: MP4, AVI, MOV, WebM, MKV
- **Documents**: PDF, DOC, DOCX
- **Archives**: ZIP, RAR
- **Web Content**: HTML, JSON, TXT, CSV

## Error Handling

The API returns appropriate HTTP status codes and error messages:

- `400` - Bad Request (invalid URL, missing parameters)
- `404` - Not Found (resource not accessible)
- `500` - Internal Server Error (processing failed)

All responses include CORS headers for web app integration.

## Changelog

### Version 2.0.0
- Updated to Node.js 22.x runtime
- Migrated to Web Standards fetch API
- Improved file streaming capabilities
- Enhanced CORS support
- Better error handling

### Version 1.0.0
- Initial release with Node.js 18.x
- Basic content conversion and downloading
