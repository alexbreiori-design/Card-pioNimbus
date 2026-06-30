import { readFile } from 'fs/promises';
import path from 'path';
import { sanitizeCategoryIconId } from '@/lib/categoryIconsShared';

const MASK_STYLE_TAG = 'nimbus-icon-mask-prep';

function buildCorelMaskStyle(svg) {
  const hasHigherFil = /class="fil[1-9]/i.test(svg);
  if (hasHigherFil) {
    return `<style id="${MASK_STYLE_TAG}" type="text/css"><![CDATA[
svg{background:none!important}
.fil0{fill:none!important}
.fil1,.fil2,.fil3,.fil4,.fil5,.fil6,.fil7,.fil8,.fil9{fill:#000!important;fill-rule:nonzero}
.str0,.str1,.str2,.str3,.str4,.str5,.str6,.str7,.str8,.str9{stroke:#000!important;fill:none!important;stroke-linecap:round;stroke-linejoin:round}
]]></style>`;
  }
  return `<style id="${MASK_STYLE_TAG}" type="text/css"><![CDATA[
svg{background:none!important}
.fil0,.fil1,.fil2,.fil3,.fil4,.fil5,.fil6,.fil7,.fil8,.fil9{fill:#000!important;fill-rule:nonzero}
.str0,.str1,.str2,.str3,.str4,.str5,.str6,.str7,.str8,.str9{stroke:#000!important;fill:none!important;stroke-linecap:round;stroke-linejoin:round}
]]></style>`;
}

function decodeSvgBuffer(buffer) {
  if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) {
    return buffer.toString('utf16le');
  }
  if (buffer.length >= 2 && buffer[0] === 0xfe && buffer[1] === 0xff) {
    return buffer.slice(2).swap16().toString('utf16le');
  }
  return buffer.toString('utf8');
}

function hasCorelClasses(svg) {
  return /class="(fil|str)\d"/i.test(svg);
}

function normalizeStrokeSvg(svg) {
  return svg.replace(/(<svg[^>]*)\sstroke="(?!none)[^"]*"/i, '$1 stroke="#000"');
}

export function normalizeSvgContent(raw) {
  let svg = String(raw || '')
    .replace(/^\uFEFF/, '')
    .replace(/<\?xml-stylesheet[^?]*\?>/gi, '')
    .replace(/<!DOCTYPE[^>]*>/gi, '')
    .replace(/encoding="UTF-16"/gi, 'encoding="UTF-8"');

  if (!/<svg[\s>]/i.test(svg)) return svg.trim();

  if (hasCorelClasses(svg)) {
    if (!svg.includes(MASK_STYLE_TAG)) {
      svg = svg.replace(/(<svg[^>]*>)/i, `$1${buildCorelMaskStyle(svg)}`);
    }
  } else {
    svg = normalizeStrokeSvg(svg);
  }

  return svg.trim();
}

export async function readNormalizedCategorySvg(iconId) {
  const safeId = sanitizeCategoryIconId(iconId);
  if (!safeId) return null;

  const filePath = path.join(process.cwd(), 'public', 'icons', `${safeId}.svg`);
  const buffer = await readFile(filePath);
  return normalizeSvgContent(decodeSvgBuffer(buffer));
}
