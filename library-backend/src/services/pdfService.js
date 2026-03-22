const sharp = require('sharp');

const generateLibraryCard = async (user) => {
    const width = 600;
    const height = 375;

    const svg = `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      .bg { fill: #ffffff; }
      .header { fill: #6B46C1; }
      .box { fill: #F7F5FF; stroke: #6B46C1; stroke-width: 3; rx: 15; ry: 15; }
      .title { fill: #ffffff; font-family: 'Arial', 'Helvetica', sans-serif; font-size: 24px; font-weight: 700; }
      .label { fill: #1A202C; font-family: 'Arial', 'Helvetica', sans-serif; font-size: 16px; font-weight: 700; }
      .value { fill: #1A202C; font-family: 'Arial', 'Helvetica', sans-serif; font-size: 16px; }
      .footer { fill: #6B46C1; font-family: 'Arial', 'Helvetica', sans-serif; font-size: 12px; font-weight: 700; }
      .accent { stroke: #6B46C1; stroke-width: 3; }
      .border { fill: none; stroke: #000000; stroke-width: 3; }
      .corner-decoration { fill: #6B46C1; }
    </style>
  </defs>

  <!-- Background -->
  <rect x="0" y="0" width="${width}" height="${height}" class="bg" />

  <!-- Header with gradient effect -->
  <rect x="0" y="0" width="${width}" height="80" class="header" />
  <rect x="0" y="75" width="${width}" height="5" fill="#5A359A" />

  <!-- Corner decorations -->
  <circle cx="20" cy="20" r="8" class="corner-decoration" />
  <circle cx="${width-20}" cy="20" r="8" class="corner-decoration" />

  <!-- Main border -->
  <rect x="6" y="6" width="${width-12}" height="${height-12}" class="border" rx="10" ry="10" />

  <!-- Data panel with rounded corners -->
  <rect x="30" y="105" width="${width-60}" height="235" class="box" />

  <!-- Decorative elements -->
  <circle cx="50" cy="125" r="4" fill="#6B46C1" />
  <circle cx="50" cy="160" r="4" fill="#6B46C1" />
  <circle cx="50" cy="195" r="4" fill="#6B46C1" />
  <circle cx="50" cy="230" r="4" fill="#6B46C1" />
  <circle cx="50" cy="265" r="4" fill="#6B46C1" />

  <!-- Header separator -->
  <line x1="30" y1="92" x2="${width-30}" y2="92" class="accent" />

  <!-- Title -->
  <text x="50%" y="45" text-anchor="middle" dominant-baseline="middle" class="title">DLCF FUTA LIBRARY CARD</text>

  <!-- User data -->
  <text x="70" y="135" class="label">NAME:</text>
  <text x="200" y="135" class="value">${user.name ? escapeXml(user.name.toUpperCase()) : 'N/A'}</text>

  <text x="70" y="170" class="label">EMAIL:</text>
  <text x="200" y="170" class="value">${user.email ? escapeXml(user.email) : 'N/A'}</text>

  <text x="70" y="205" class="label">PHONE:</text>
  <text x="200" y="205" class="value">${user.phone ? escapeXml(user.phone) : 'N/A'}</text>

  <text x="70" y="240" class="label">REG DATE:</text>
  <text x="200" y="240" class="value">${escapeXml(new Date().toLocaleDateString())}</text>

  <text x="70" y="275" class="label">CARD ID:</text>
  <text x="200" y="275" class="value">${escapeXml(`DLCF-${Date.now().toString().slice(-6)}`)}</text>

  <!-- Footer separator -->
  <line x1="30" y1="340" x2="${width-30}" y2="340" class="accent" />

  <!-- Footer -->
  <text x="50%" y="360" text-anchor="middle" class="footer">DLCF FUTA - Library Management System</text>

  <!-- Bottom corner decorations -->
  <circle cx="20" cy="${height-20}" r="6" class="corner-decoration" />
  <circle cx="${width-20}" cy="${height-20}" r="6" class="corner-decoration" />
</svg>
`;

    const jpegBuffer = await sharp(Buffer.from(svg))
        .jpeg({ quality: 95 })
        .toBuffer();

    return jpegBuffer;
};

function escapeXml(unsafe) {
    return unsafe.replace(/[<>&'\"]/g, c => ({
        '<': '&lt;',
        '>': '&gt;',
        '&': '&amp;',
        '\'': '&apos;',
        '"': '&quot;'
    })[c]);
}

module.exports = { generateLibraryCard };
