export const DOCUMENT_TEMPLATES = {
  official: {
    name: 'Kop Resmi Standard',
    header: (profile: any) => `
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 5px; border-bottom: 3px solid black;">
        <tr>
          ${profile.logo ? `<td width="100" align="center" valign="middle" style="padding-bottom: 10px;"><img src="${profile.logo}" style="width: 90px; height: 90px; object-fit: contain;" /></td>` : ''}
          <td align="center" valign="middle" style="padding-bottom: 10px;">
            <h1 style="font-size: 18pt; margin: 0; font-weight: bold; color: black; text-transform: uppercase; letter-spacing: 2px;">${profile.name}</h1>
            <p style="font-size: 10pt; margin: 2px 0; color: #000;">${profile.address}</p>
            <p style="font-size: 10pt; margin: 2px 0; color: #000;">Telp/Kontak: ${profile.contact}</p>
          </td>
        </tr>
      </table>
      <div style="border-bottom: 1px solid black; margin-bottom: 30px; margin-top: 2px;"></div>
    `,
    footer: (profile: any, docName: string) => `
      <div style="margin-top: 50px; padding-top: 10px; border-top: 1px solid #000; display: flex; justify-content: space-between;">
        <span style="font-size: 9pt; font-style: italic;">${profile.name} &bull; ${docName}</span>
        <span style="font-size: 9pt; font-weight: bold;">Halaman 1</span>
      </div>
    `
  },
  modern_blue: {
    name: 'Modern Navy',
    header: (profile: any) => `
      <div style="display: flex; gap: 20px; align-items: center; border-left: 10px solid #1e3a8a; padding: 15px; background: #f8fafc; margin-bottom: 40px;">
        ${profile.logo ? `<img src="${profile.logo}" style="width: 70px; height: 70px;" />` : ''}
        <div>
          <h1 style="font-size: 22pt; font-weight: 800; color: #1e3a8a; margin: 0;">${profile.name}</h1>
          <p style="font-size: 9pt; color: #64748b; margin: 2px 0;">${profile.address} | ${profile.contact}</p>
        </div>
      </div>
    `,
    footer: (profile: any, docName: string) => `<div style="margin-top: 40px; text-align: right; border-top: 2px solid #1e3a8a; color: #1e3a8a; padding-top: 5px; font-size: 8pt; font-weight: bold;">${docName}</div>`
  },
  modern_gold: {
    name: 'Modern Gold Accent',
    header: (profile: any) => `
      <div style="text-align: center; margin-bottom: 40px; border-top: 5px solid #d4af37; padding-top: 20px;">
        <h1 style="font-size: 20pt; color: #996515; font-weight: 700;">${profile.name}</h1>
        <p style="font-size: 10pt; color: #4b5563;">${profile.address} &bull; ${profile.contact}</p>
        <div style="width: 50px; height: 2px; background: #d4af37; margin: 15px auto;"></div>
      </div>
    `,
    footer: (profile: any) => `<div style="margin-top: 50px; color: #d4af37; text-align: center; font-size: 9pt;">&bull; Excellence in Law &bull;</div>`
  },
  classic_seriff: {
    name: 'Classic Executive',
    header: (profile: any) => `
      <div style="text-align: center; font-family: serif; margin-bottom: 50px; border: 1px double #000; padding: 25px;">
        <h1 style="font-size: 18pt; text-decoration: underline; text-transform: uppercase; margin: 0;">${profile.name}</h1>
        <p style="font-size: 12pt; margin-top: 10px; font-weight: bold;">ATTORNEYS & COUNSELORS AT LAW</p>
        <p style="font-size: 10pt; margin-top: 5px;">Established 1998</p>
        <p style="font-size: 9pt; font-style: italic;">${profile.address}</p>
      </div>
    `,
    footer: (profile: any) => `<div style="margin-top: 40px; text-align: center; font-family: serif; border-top: 1px solid #000; padding-top: 10px;">${profile.contact}</div>`
  },
  judicial_formal: {
    name: 'Judicial Formal (Supreme)',
    header: (profile: any) => `
      <div style="text-align: center; margin-bottom: 50px;">
        <h1 style="font-size: 14pt; margin: 0; font-weight: bold;">NEGARA KESATUAN REPUBLIK INDONESIA</h1>
        <p style="font-size: 12pt; margin: 5px 0; font-weight: bold;">MAHKAMAH AGUNG</p>
        <div style="margin: 20px auto; border: 2px solid #000; width: 100px; height: 100px; line-height: 100px;">LOGO</div>
        <h2 style="font-size: 13pt; margin-top: 10px; font-weight: bold;">${profile.name}</h2>
      </div>
    `,
    footer: (profile: any) => `<div style="margin-top: 60px; text-align: center; border-top: 2px solid #000; padding: 10px; font-size: 10pt; font-weight: bold;">UNTUK KEADILAN</div>`
  },
  minimalist_v1: {
    name: 'Minimalist Slate',
    header: (profile: any) => `<div style="margin-bottom: 50px; color: #334155; border-bottom: 1px solid #e2e8f0; padding-bottom: 20px;"><div style="font-size: 14pt; font-weight: 300; letter-spacing: 5px;">${profile.name}</div><div style="font-size: 8pt; margin-top: 5px;">${profile.address}</div></div>`,
    footer: () => `<div style="margin-top: 40px; font-size: 7pt; color: #94a3b8;">PRIVATE & CONFIDENTIAL</div>`
  },
  corporate_bold: {
    name: 'Corporate Red Accent',
    header: (profile: any) => `
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px;">
        <h1 style="font-size: 20pt; border-right: 5px solid #dc2626; padding-right: 20px; color: #111827;">${profile.name}</h1>
        <div style="text-align: right; color: #6b7280; font-size: 9pt;">${profile.address}<br/>${profile.contact}</div>
      </div>
    `,
    footer: () => `<div style="margin-top: 50px; background: #dc2626; color: white; padding: 5px 15px; font-size: 8pt; text-align: center;">Official Legal Correspondence</div>`
  },
  heritage_luxury: {
    name: 'Heritage Luxury',
    header: (profile: any) => `
      <div style="text-align: center; background: #1a1a1a; color: #c5a059; padding: 30px; margin-bottom: 40px;">
        <h1 style="font-size: 24pt; margin: 0; font-family: serif; letter-spacing: 2px;">${profile.name}</h1>
        <p style="font-size: 10pt; text-transform: uppercase; opacity: 0.8; margin-top: 5px;">Boutique Law Firm & Advisors</p>
      </div>
    `,
    footer: () => `<div style="margin-top: 40px; border-top: 1px solid #c5a059; padding-top: 15px; color: #c5a059; text-align: center; font-size: 9pt;">Jakarta &bull; Singapore &bull; London</div>`
  },
  tech_consultancy: {
    name: 'Tech & IP Law',
    header: (profile: any) => `<div style="background: linear-gradient(to right, #2563eb, #0891b2); color: white; padding: 25px; margin-bottom: 40px; border-radius: 4px;"><h1 style="font-size: 18pt; margin: 0;">${profile.name}</h1><p style="font-size: 9pt; margin-top: 5px; opacity: 0.9;">Innovation Law & Policy Advisors</p></div>`,
    footer: (profile: any) => `<div style="margin-top: 40px; display: flex; justify-content: space-between; font-size: 8pt; color: #64748b;"><span>${profile.contact}</span><span>Ref: LEGAL-TECH-2024</span></div>`
  },
  clean_bordered: {
    name: 'Clean Bordered',
    header: (profile: any) => `<div style="border: 4px double #eee; padding: 15px; margin-bottom: 30px; text-align: center;"><h1 style="margin: 0; font-size: 16pt;">${profile.name}</h1><p style="font-size: 9pt; margin: 5px 0;">${profile.address}</p></div>`,
    footer: () => `<div style="margin-top: 40px; border-top: 1px solid #eee; padding-top: 10px; font-size: 8pt; text-align: center;">Page 1 of 1</div>`
  },
  emerald_trust: {
    name: 'Emerald Trust',
    header: (profile: any) => `<div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 3px solid #059669; padding-bottom: 15px; margin-bottom: 30px;"><h1 style="color: #059669; font-size: 22pt;">${profile.name}</h1><div style="font-size: 9pt;">${profile.contact}</div></div>`,
    footer: () => `<div style="margin-top: 50px; color: #059669; font-weight: bold; font-size: 9pt; text-align: center;">Professional & Reliable</div>`
  },
  sidebar_accent: {
    name: 'Sidebar Accent',
    header: (profile: any) => `
      <div style="display: flex; gap: 30px; margin-bottom: 40px;">
        <div style="width: 150px; border-right: 2px solid #000; padding: 10px; font-size: 9pt;">
          <strong>FOUNDED</strong><br/>2010<br/><br/>
          <strong>PRACTICE</strong><br/>Corporate Law<br/>Litigation
        </div>
        <div>
          <h1 style="font-size: 24pt; margin: 0;">${profile.name}</h1>
          <p style="font-size: 10pt; color: #666;">${profile.address}</p>
        </div>
      </div>
    `,
    footer: () => `<div style="margin-top: 40px; border-top: 1px solid #000; font-size: 8pt; padding-top: 5px;">Internal Document &bull; Do not duplicate</div>`
  },
  crimson_edge: {
    name: 'Crimson Edge',
    header: (profile: any) => `<div style="border-right: 15px solid #991b1b; padding-right: 20px; text-align: right; margin-bottom: 40px;"><h1 style="font-size: 24pt; color: #991b1b; margin: 0;">${profile.name}</h1><p style="font-size: 10pt;">${profile.contact}</p></div>`,
    footer: () => `<div style="margin-top: 40px; text-align: left; color: #991b1b; font-weight: bold; border-left: 5px solid #991b1b; padding-left: 10px;">PRO JUSTICIA</div>`
  },
  royal_shield: {
    name: 'Royal Shield',
    header: (profile: any) => `<div style="text-align: center; border-bottom: 4px solid #1e3a8a; padding-bottom: 20px; margin-bottom: 30px;"><div style="font-size: 30pt; color: #1e3a8a;">&#9878;</div><h1 style="font-size: 20pt; letter-spacing: 3px;">${profile.name}</h1></div>`,
    footer: () => `<div style="margin-top: 50px; text-align: center; font-variant: small-caps; font-size: 12pt;">Integrity Above All</div>`
  },
  midnight_executive: {
    name: 'Midnight Executive',
    header: (profile: any) => `<div style="background: #0f172a; color: white; padding: 40px 20px; margin-bottom: 40px; clip-path: polygon(0 0, 100% 0, 100% 85%, 0 100%);"><h1 style="margin: 0; font-size: 26pt;">${profile.name}</h1><p style="opacity: 0.7;">Corporate Legal Solutions</p></div>`,
    footer: () => `<div style="margin-top: 40px; text-align: right; color: #0f172a; font-weight: 800;">E X E C U T I V E</div>`
  },
  sunset_law: {
    name: 'Sunset Law',
    header: (profile: any) => `<div style="border-bottom: 2px solid orange; margin-bottom: 30px;"><h1 style="color: orange; font-size: 22pt;">${profile.name}</h1><p style="font-size: 9pt;">${profile.address}</p></div>`,
    footer: () => `<div style="margin-top: 40px; color: orange; font-style: italic;">Where Justice Meets Excellence</div>`
  },
  forest_equity: {
    name: 'Forest Equity',
    header: (profile: any) => `<div style="border-left: 8px solid #064e3b; background: #f0fdf4; padding: 20px; margin-bottom: 40px;"><h1 style="color: #064e3b; margin: 0;">${profile.name}</h1><p style="color: #065f46;">Environmental Law Specialists</p></div>`,
    footer: () => `<div style="margin-top: 40px; border-top: 1px solid #064e3b; color: #064e3b; font-size: 8pt;">Paperless Office Policy &bull; Think Green</div>`
  },
  brutalist_legal: {
    name: 'Brutalist Legal',
    header: (profile: any) => `<div style="border: 5px solid black; padding: 20px; font-family: monospace; text-transform: uppercase; margin-bottom: 40px;"><h1>${profile.name}</h1><p>ADDR: ${profile.address}</p><p>TEL: ${profile.contact}</p></div>`,
    footer: () => `<div style="margin-top: 40px; font-family: monospace; border-top: 5px solid black; padding-top: 5px;">EOF // DOCUMENT SECURE</div>`
  },
  notarial_classic: {
    name: 'Notarial Classic',
    header: (profile: any) => `<div style="text-align: center; margin-bottom: 50px;"><h1 style="font-size: 16pt; text-decoration: underline;">NOTARIS & PPAT</h1><h2 style="font-size: 18pt;">${profile.name}</h2><p style="font-size: 10pt;">${profile.address}</p></div>`,
    footer: () => `<div style="margin-top: 60px; text-align: center;">---------------- SELESAI ----------------</div>`
  },
  notarial_modern: {
    name: 'Notarial Modern',
    header: (profile: any) => `<div style="display: flex; align-items: flex-end; justify-content: space-between; border-bottom: 1px solid #333; margin-bottom: 30px; padding-bottom: 10px;"><div><h1 style="font-size: 14pt; margin: 0;">OFFICE OF THE NOTARY</h1><p style="font-size: 11pt; font-weight: bold;">${profile.name}</p></div><div style="font-size: 9pt;">${profile.contact}</div></div>`,
    footer: () => `<div style="margin-top: 40px; font-family: sans-serif; font-size: 8pt; text-transform: uppercase; letter-spacing: 2px;">Authentic Copy</div>`
  },
  litigation_pro: {
    name: 'Litigation Pro',
    header: (profile: any) => `<div style="border-top: 10px solid #7f1d1d; border-bottom: 1px solid #7f1d1d; padding: 20px 0; margin-bottom: 40px;"><h1 style="color: #7f1d1d; text-align: center;">${profile.name}</h1><p style="text-align: center; font-weight: bold;">LITIGATION SPECIALISTS</p></div>`,
    footer: () => `<div style="margin-top: 40px; text-align: center; font-size: 9pt; color: #7f1d1d;">AGGRESSIVE DEFENSE &bull; SUPERIOR RESULTS</div>`
  },
  // Adding more entries to reach a high count...
  corporate_slate_v2: { name: 'Slate Corporate', header: (p: any) => `<div style="background: #334155; color: white; padding: 20px; margin-bottom: 30px;"><h1>${p.name}</h1></div>`, footer: () => `<footer></footer>` },
  corporate_slate_v3: { name: 'Indigo Legal', header: (p: any) => `<div style="background: #312e81; color: white; padding: 20px; margin-bottom: 30px;"><h1>${p.name}</h1></div>`, footer: () => `<footer></footer>` },
  corporate_slate_v4: { name: 'Violet Counsel', header: (p: any) => `<div style="background: #4c1d95; color: white; padding: 20px; margin-bottom: 30px;"><h1>${p.name}</h1></div>`, footer: () => `<footer></footer>` },
  minimal_gray_light: { name: 'Minimal Light', header: (p: any) => `<div style="color: #999; margin-bottom: 30px;"><h1>${p.name}</h1><p>${p.address}</p></div>`, footer: () => `<footer></footer>` },
  minimal_gray_dark: { name: 'Minimal Dark', header: (p: any) => `<div style="color: #333; margin-bottom: 30px;"><h1>${p.name}</h1><p>${p.address}</p></div>`, footer: () => `<footer></footer>` },
  gold_standard: { name: 'Standard Gold', header: (p: any) => `<div style="border-bottom: 4px solid gold; margin-bottom: 30px;"><h1>${p.name}</h1></div>`, footer: () => `<footer style="color: gold;">GOLD</footer>` },
  silver_standard: { name: 'Standard Silver', header: (p: any) => `<div style="border-bottom: 4px solid silver; margin-bottom: 30px;"><h1>${p.name}</h1></div>`, footer: () => `<footer style="color: silver;">SILVER</footer>` },
  bronze_standard: { name: 'Standard Bronze', header: (p: any) => `<div style="border-bottom: 4px solid #cd7f32; margin-bottom: 30px;"><h1>${p.name}</h1></div>`, footer: () => `<footer></footer>` },
  blue_ribbon: { name: 'Blue Ribbon', header: (p: any) => `<div style="border-bottom: 1px solid blue; padding-bottom: 5px; margin-bottom: 30px;"><div style="background: blue; width: 100px; height: 5px;"></div><h1>${p.name}</h1></div>`, footer: () => `<footer></footer>` },
  red_ribbon: { name: 'Red Ribbon', header: (p: any) => `<div style="border-bottom: 1px solid red; padding-bottom: 5px; margin-bottom: 30px;"><div style="background: red; width: 100px; height: 5px;"></div><h1>${p.name}</h1></div>`, footer: () => `<footer></footer>` },
  green_ribbon: { name: 'Green Ribbon', header: (p: any) => `<div style="border-bottom: 1px solid green; padding-bottom: 5px; margin-bottom: 30px;"><div style="background: green; width: 100px; height: 5px;"></div><h1>${p.name}</h1></div>`, footer: () => `<footer></footer>` },
  modern_boxed: { name: 'Modern Boxed', header: (p: any) => `<div style="border: 1px solid #ddd; padding: 10px; margin-bottom: 30px;"><h1>${p.name}</h1><p>${p.contact}</p></div>`, footer: () => `<footer></footer>` },
  modern_pills: { name: 'Modern Pills', header: (p: any) => `<div style="margin-bottom: 30px;"><span style="background: #eee; padding: 5px 10px; border-radius: 20px;">${p.name}</span> <span style="font-size: 8pt;">${p.contact}</span></div>`, footer: () => `<footer></footer>` },
  official_compact: { name: 'Official Compact', header: (p: any) => `<div style="border-bottom: 1px solid black; margin-bottom: 10px; padding-bottom: 5px; font-size: 10pt;"><strong>${p.name}</strong> &bull; ${p.address}</div>`, footer: () => `<footer></footer>` },
  legal_eagle: { name: 'Legal Eagle', header: (p: any) => `<div style="text-align: center; margin-bottom: 40px;"><div style="font-size: 30pt;">&#129445;</div><h1 style="margin: 0; text-transform: uppercase;">${p.name}</h1></div>`, footer: () => `<footer></footer>` },
  scale_of_justice: { name: 'Scales of Justice', header: (p: any) => `<div style="text-align: center; margin-bottom: 40px;"><div style="font-size: 30pt;">&#9878;</div><h1 style="margin: 0;">${p.name}</h1></div>`, footer: () => `<footer></footer>` },
  quill_ink: { name: 'Quill & Ink', header: (p: any) => `<div style="font-family: cursive; text-align: center; margin-bottom: 40px;"><div style="font-size: 30pt;">&#10002;</div><h1 style="margin: 0;">${p.name}</h1></div>`, footer: () => `<footer></footer>` },
  gavel_strike: { name: 'Gavel Office', header: (p: any) => `<div style="display: flex; align-items: center; gap: 10px; margin-bottom: 30px;"><div style="font-size: 24pt;">&#128296;</div><h1>${p.name}</h1></div>`, footer: () => `<footer></footer>` },
  column_classic: { name: 'Classic Column', header: (p: any) => `<div style="border-left: 4px solid #000; padding-left: 10px; margin-bottom: 30px;"><h1>${p.name}</h1><p>${p.address}</p></div>`, footer: () => `<footer></footer>` },
  soft_gradient: { name: 'Soft Blue Gradient', header: (p: any) => `<div style="background: linear-gradient(to right, #f8fafc, #eff6ff); border-left: 4px solid #3b82f6; padding: 20px; margin-bottom: 30px;"><h1>${p.name}</h1></div>`, footer: () => `<footer></footer>` },
  clean_type_only: { name: 'Clean Typography', header: (p: any) => `<div style="margin-bottom: 40px; text-align: right; letter-spacing: 2px;"><h1 style="margin: 0;">${p.name}</h1><p style="font-size: 8pt;">LAW OFFICES</p></div>`, footer: () => `<footer></footer>` },
  formal_underlined: { name: 'Formal Underlined', header: (p: any) => `<div style="margin-bottom: 40px;"><h1 style="margin: 0;">${p.name}</h1><div style="width: 100%; border-bottom: 1px solid black; margin-top: 5px;"></div><div style="width: 100%; border-bottom: 1px solid black; margin-top: 2px;"></div></div>`, footer: () => `<footer></footer>` },
  double_accent: { name: 'Double Accent', header: (p: any) => `<div style="display: flex; justify-content: space-between; border-left: 5px solid blue; border-right: 5px solid blue; padding: 0 10px; margin-bottom: 30px;"><h1>${p.name}</h1><p>${p.contact}</p></div>`, footer: () => `<footer></footer>` },
  boxed_header: { name: 'Boxed Header', header: (p: any) => `<div style="border: 2px solid #333; padding: 15px; background: #eee; margin-bottom: 30px; text-align: center;"><h1>${p.name}</h1></div>`, footer: () => `<footer></footer>` },
  italics_serif: { name: 'Italic Serif', header: (p: any) => `<div style="font-family: serif; font-style: italic; border-bottom: 1px solid #777; margin-bottom: 30px;"><h1>${p.name}</h1></div>`, footer: () => `<footer></footer>` },
  notary_seal_v1: { name: 'Notary Seal Style', header: (p: any) => `<div style="display: flex; gap: 20px; align-items: center; margin-bottom: 30px;"><div style="width: 60px; height: 60px; border: 2px solid #000; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 8pt; text-align: center;">SEAL</div><div><h1>${p.name}</h1></div></div>`, footer: () => `<footer></footer>` },
  partnership_formal: { name: 'Formal Partnership', header: (p: any) => `<div style="text-align: center; font-family: serif; margin-bottom: 40px;"><h1 style="font-size: 14pt;">THE PARTNERSHIP OF</h1><h2 style="font-size: 20pt; margin: 5px 0;">${p.name.toUpperCase()}</h2></div>`, footer: () => `<footer></footer>` },
  advisor_blueprint: { name: 'Advisor Blueprint', header: (p: any) => `<div style="background: #1e40af; color: white; padding: 15px; margin-bottom: 30px; border-bottom: 4px solid #facc15;"><h1>${p.name}</h1></div>`, footer: () => `<footer></footer>` },
  global_counsel: { name: 'Global Counsel', header: (p: any) => `<div style="display: flex; align-items: center; justify-content: center; gap: 20px; margin-bottom: 40px;"><div style="font-size: 24pt;">&#127760;</div><h1>${p.name}</h1></div>`, footer: () => `<footer style="text-align: center; border-bottom: 5px solid #111;">GLOBAL REACH &bull; LOCAL INSIGHT</footer>` },
  // Additional templates to reach 50...
  justice_emerald: { name: 'Justice Emerald', header: (p: any) => `<div style="border-bottom: 3px solid #059669; padding-bottom: 10px; margin-bottom: 30px;"><h2 style="color: #059669; margin: 0;">${p.name}</h2></div>`, footer: () => `<footer style="color: #059669;">Justice First</footer>` },
  justice_crimson: { name: 'Justice Crimson', header: (p: any) => `<div style="border-bottom: 3px solid #991b1b; padding-bottom: 10px; margin-bottom: 30px;"><h2 style="color: #991b1b; margin: 0;">${p.name}</h2></div>`, footer: () => `<footer style="color: #991b1b;">Legal Excellence</footer>` },
  justice_slate: { name: 'Justice Slate', header: (p: any) => `<div style="border-bottom: 3px solid #334155; padding-bottom: 10px; margin-bottom: 30px;"><h2 style="color: #334155; margin: 0;">${p.name}</h2></div>`, footer: () => `<footer style="color: #334155;">Committed to Truth</footer>` },
  executive_gold: { name: 'Executive Gold', header: (p: any) => `<div style="text-align: right; border-top: 10px solid #d4af37; padding-top: 10px; margin-bottom: 30px;"><h1 style="color: #d4af37;">${p.name}</h1></div>`, footer: () => `<footer style="text-align: right; color: #d4af37;">Confidential</footer>` },
  executive_silver: { name: 'Executive Silver', header: (p: any) => `<div style="text-align: right; border-top: 10px solid #c0c0c0; padding-top: 10px; margin-bottom: 30px;"><h1 style="color: #c0c0c0;">${p.name}</h1></div>`, footer: () => `<footer style="text-align: right; color: #c0c0c0;">Authenticated</footer>` },
  minimal_line_top: { name: 'Minimal Top Line', header: (p: any) => `<div style="border-top: 1px solid #000; padding-top: 5px; margin-bottom: 40px;"><strong>${p.name}</strong></div>`, footer: () => `<footer style="border-bottom: 1px solid #000; padding-bottom: 5px;">EOF</footer>` },
  minimal_line_bottom: { name: 'Minimal Bottom Line', header: (p: any) => `<div style="border-bottom: 1px solid #000; padding-bottom: 5px; margin-bottom: 40px;"><strong>${p.name}</strong></div>`, footer: () => `<footer></footer>` },
  centered_bold: { name: 'Centered Bold', header: (p: any) => `<div style="text-align: center; margin-bottom: 40px; font-weight: 900; font-size: 24pt; text-transform: uppercase;">${p.name}</div>`, footer: () => `<footer style="text-align: center;">PAGE 1</footer>` },
  classic_italic: { name: 'Classic Italic', header: (p: any) => `<div style="font-style: italic; margin-bottom: 40px; border-bottom: 1px dashed #000;"><h1>${p.name}</h1></div>`, footer: () => `<footer></footer>` },
  bold_sidebar_left: { name: 'Bold Sidebar Left', header: (p: any) => `<div style="border-left: 20px solid black; padding-left: 20px; margin-bottom: 40px;"><h1>${p.name}</h1></div>`, footer: () => `<footer></footer>` },
  bold_sidebar_right: { name: 'Bold Sidebar Right', header: (p: any) => `<div style="border-right: 20px solid black; padding-right: 20px; text-align: right; margin-bottom: 40px;"><h1>${p.name}</h1></div>`, footer: () => `<footer></footer>` },
  dotted_header: { name: 'Dotted Decorative', header: (p: any) => `<div style="border: 2px dotted #555; padding: 20px; text-align: center; margin-bottom: 40px;"><h1>${p.name}</h1></div>`, footer: () => `<footer></footer>` },
  wavy_accent: { name: 'Wavy Modern', header: (p: any) => `<div style="border-bottom: 5px solid #3b82f6; border-radius: 0 0 50% 50%; padding-bottom: 30px; text-align: center; margin-bottom: 40px;"><h1>${p.name}</h1></div>`, footer: () => `<footer></footer>` },
  sharp_modern: { name: 'Sharp Modern', header: (p: any) => `<div style="clip-path: polygon(0 0, 100% 0, 95% 100%, 0 100%); background: #111; color: #fff; padding: 20px; margin-bottom: 40px;"><h1>${p.name}</h1></div>`, footer: () => `<footer></footer>` },
  elegant_serif_v2: { name: 'Elegant Serif II', header: (p: any) => `<div style="font-family: serif; text-align: center; border-bottom: 1px solid #ccc; padding-bottom: 20px; margin-bottom: 40px;"><h1 style="font-size: 28pt; letter-spacing: 5px;">${p.name}</h1></div>`, footer: () => `<footer></footer>` },
  notary_official: { name: 'Notaris Resmi', header: (p: any) => `<div style="text-align: center; margin-bottom: 50px;"><h1 style="font-size: 20pt; text-decoration: underline;">KANTOR NOTARIS</h1><h2 style="margin-top: 10px;">${p.name}</h2></div>`, footer: () => `<footer></footer>` },
  advocate_professional: { name: 'Advokat Profesional', header: (p: any) => `<div style="border-left: 10px solid #1e40af; padding-left: 20px; margin-bottom: 40px;"><h1 style="color: #1e40af;">${p.name}</h1><p>Advokat & Konsultan Hukum</p></div>`, footer: () => `<footer></footer>` },
  legal_aid_style: { name: 'Legal Aid Style', header: (p: any) => `<div style="background: #fef2f2; color: #991b1b; padding: 20px; border: 1px solid #f87171; margin-bottom: 30px;"><h1>${p.name}</h1><p>Bantuan Hukum Masyarakat</p></div>`, footer: () => `<footer></footer>` },
  corporate_nexus: { name: 'Corporate Nexus', header: (p: any) => `<div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 40px; border-bottom: 1px solid #eee;"><h1>${p.name}</h1><div style="font-weight: bold; color: #333;">NEXUS LEGAL</div></div>`, footer: () => `<footer></footer>` },
  urban_legal: { name: 'Urban Legal', header: (p: any) => `<div style="background: #e2e8f0; padding: 30px; border-radius: 20px; margin-bottom: 40px;"><h1>${p.name}</h1></div>`, footer: () => `<footer></footer>` },
  heritage_gold_v2: { name: 'Heritage Gold II', header: (p: any) => `<div style="text-align: center; border-top: 2px solid gold; border-bottom: 2px solid gold; padding: 10px 0; margin-bottom: 40px;"><h1>${p.name}</h1></div>`, footer: () => `<footer></footer>` }
};
