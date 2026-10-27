import {REPORT_FONTS} from './vendor/report-fonts.js';
// Fixed, preprocessed glyph maps for the two bundled fonts. No arbitrary font parser,
// browser/system font substitution, external download or text shaping is needed.
export async function embedReportFonts(doc){
 const embedded=[];
 for(const data of REPORT_FONTS){
  const glyphForCodePoint=cp=>{const [id,advanceWidth]=data.glyphs[cp]||data.glyphs[63];return {id,advanceWidth,codePoints:[cp]};};
  const font={unitsPerEm:data.unitsPerEm,postscriptName:data.name,ascent:data.ascent,descent:data.descent,bbox:data.bbox,italicAngle:0,post:{isFixedPitch:false},head:{macStyle:{italic:false}},characterSet:Object.keys(data.glyphs).map(Number),glyphForCodePoint,layout:text=>({glyphs:Array.from(text,c=>glyphForCodePoint(c.codePointAt(0)))})};
  doc.registerFontkit({create:()=>font});
  embedded.push(await doc.embedFont(Uint8Array.from(atob(data.base64),c=>c.charCodeAt(0)),{subset:false}));
 }
 return embedded;
}
