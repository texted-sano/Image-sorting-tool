// ==========================================
// ★ 変更厳禁 ★ EPUB組み立てロジック
//
// epub-templates.js の雛形を使い、EPUBファイル（実体はZIP）を組み立てる処理です。
// ここを変更すると納品するEPUBの中身が変わります。
// 変更した場合は、変更前後で同じ素材からEPUBを作り、解凍して中身を比較してください。
// ==========================================

const EPUB_BUILDER = (() => {

    class ZipDocument {
        constructor() { this.parts =[]; this.cDirs =[]; this.offset = 0; this.enc = new TextEncoder(); }
        getDosTime() { const d = new Date(); return { time: (d.getHours()<<11)|(d.getMinutes()<<5)|(d.getSeconds()>>1), date: ((d.getFullYear()-1980)<<9)|((d.getMonth()+1)<<5)|d.getDate() }; }
        addFile(n, d) { this._addFileInternal(n, d, d.length, d); }
        async addFileAsync(n, blob) { const d = new Uint8Array(await blob.arrayBuffer()); this._addFileInternal(n, d, blob.size, blob); }
        crc32(d) { let c = 0^(-1); for(let i=0; i<d.length; i++) { c^=d[i]; for(let j=0; j<8; j++) c=(c&1)?(c>>>1)^0xEDB88320:(c>>>1); } return (c^(-1))>>>0; }
        _addFileInternal(n, d, s, store) {
            const nb = this.enc.encode(n); const crc = this.crc32(d); const td = this.getDosTime();
            const lfh = new Uint8Array(30 + nb.length); const v = new DataView(lfh.buffer);
            v.setUint32(0, 0x04034b50, true); v.setUint16(4, 10, true); v.setUint16(6, 0x0800, true); v.setUint16(10, td.time, true); v.setUint16(12, td.date, true); v.setUint32(14, crc, true); v.setUint32(18, s, true); v.setUint32(22, s, true); v.setUint16(26, nb.length, true); lfh.set(nb, 30);
            this.parts.push(lfh); this.parts.push(store);
            const cd = new Uint8Array(46 + nb.length); const cv = new DataView(cd.buffer);
            cv.setUint32(0, 0x02014b50, true); cv.setUint16(4, 10, true); cv.setUint16(6, 10, true); cv.setUint16(8, 0x0800, true); cv.setUint16(12, td.time, true); cv.setUint16(14, td.date, true); cv.setUint32(16, crc, true); cv.setUint32(20, s, true); cv.setUint32(24, s, true); cv.setUint16(28, nb.length, true); cv.setUint32(42, this.offset, true); cd.set(nb, 46);
            this.cDirs.push(cd); this.offset += lfh.length + s;
        }
        finish() {
            let cs = 0; this.cDirs.forEach(cd => cs += cd.length); const eocd = new Uint8Array(22); const v = new DataView(eocd.buffer);
            v.setUint32(0, 0x06054b50, true); v.setUint16(8, this.cDirs.length, true); v.setUint16(10, this.cDirs.length, true); v.setUint32(12, cs, true); v.setUint32(16, this.offset, true);
            return new Blob([...this.parts, ...this.cDirs, eocd], { type: 'application/zip' });
        }
    }


    class EpubImageTools {
        async processImageResize(file, opts) {
            const bmp = await createImageBitmap(file); let tw = bmp.width, th = bmp.height, dx = 0, dy = 0, dw = bmp.width, dh = bmp.height;
            if (opts.mode === 'fit-width') { tw = opts.baseW; th = Math.max(1, Math.round(bmp.height * (opts.baseW/bmp.width))); dw = tw; dh = th; }
            else if (opts.mode === 'fit-height') { tw = Math.max(1, Math.round(bmp.width * (opts.baseH/bmp.height))); th = opts.baseH; dw = tw; dh = th; }
            else if (opts.mode === 'pad-white-v') { tw = opts.baseW; th = opts.baseH; dw = Math.max(1, Math.round(bmp.width * (opts.baseH/bmp.height))); dh = opts.baseH; dx = (opts.baseW - dw) / 2; dy = 0; }
            else if (opts.mode === 'pad-white-h') { tw = opts.baseW; th = opts.baseH; dw = opts.baseW; dh = Math.max(1, Math.round(bmp.height * (opts.baseW/bmp.width))); dx = 0; dy = (opts.baseH - dh) / 2; }
            const canvas = new OffscreenCanvas(tw, th); const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, tw, th); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high'; ctx.drawImage(bmp, dx, dy, dw, dh); bmp.close();
            return await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.9 });
        }
        _generateUUID() { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID(); return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8); return v.toString(16); }); }
        _escapeXml(s) { return s.replace(/[<>&'"]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','\'':'&apos;','"':'&quot;'}[c])); }
    }

    class EpubGenerator {
        constructor() { this.fs = new EpubImageTools(); }
async generate(items, meta, view, onP, baseN, rOpts=null) {
            let handle = null; let sTitle = (meta.title || '').replace(/[\\/:*?"<>|]/g, '_'); const sName = sTitle ? `${sTitle}.epub` : (baseN ? `${baseN}.epub` : 'book.epub');
            if ('showSaveFilePicker' in window) { try { handle = await window.showSaveFilePicker({ suggestedName: sName, startIn: 'downloads', types:[{ accept: {'application/epub+zip':['.epub']} }] }); } catch (e) { if(e.name==='AbortError')return false; throw e; } }
            const zip = new ZipDocument(); const enc = new TextEncoder();
            zip.addFile('mimetype', enc.encode(EPUB_TEMPLATES.mimetype)); zip.addFile('META-INF/container.xml', enc.encode(EPUB_TEMPLATES.container)); zip.addFile('item/style/fixed-layout-jp.css', enc.encode(EPUB_TEMPLATES.css));
            let navL='', navP='', pO=1, mI='', mX='', sS=''; const pad = Math.max(3, String(items.length).length);
            const tit = this.fs._escapeXml(meta.title || 'Untitled'); const titR = this.fs._escapeXml(meta.titleRuby || meta.title || 'Untitled');
            const aut = this.fs._escapeXml(meta.author || ''); const autR = this.fs._escapeXml(meta.authorRuby || meta.author || '');
            const pub = this.fs._escapeXml(meta.publisher || ''); const pubR = this.fs._escapeXml(meta.publisherRuby || meta.publisher || '');
            const bId = this.fs._escapeXml(meta.bookId || 'urn:uuid:' + this.fs._generateUUID());
            let mDate; try { const d = meta.modified?new Date(meta.modified):new Date(); if(!isNaN(d.getTime())) mDate = d.toISOString().split('.')[0]+'Z'; else mDate = new Date().toISOString().split('.')[0]+'Z'; } catch(e) { mDate = new Date().toISOString().split('.')[0]+'Z'; }
            let cw=0, ch=0; if (!meta.includeImages) zip.addFile('item/image/', new Uint8Array(0));
            for (let i=0; i<items.length; i++) {
                const it = items[i]; const file = it.editedBlob || await it.handle.getFile(); const idx = i+1; const isC = (idx===1); const nStr = String(idx).padStart(pad, '0');
                let ext = it.name.includes('.') ? it.name.split('.').pop().toLowerCase() : 'jpg'; let intImgN = isC ? `cover.${ext}` : `img-${nStr}.${ext}`; let mime = 'image/jpeg';
                let dw = file, w, h;
                if (rOpts && rOpts.mode !== 'none') {
                    const blob = await this.fs.processImageResize(file, rOpts); intImgN = isC ? 'cover.jpg' : `img-${nStr}.jpg`; mime = 'image/jpeg';
                    dw = new File([blob], intImgN, { type: 'image/jpeg' }); const bmp = await createImageBitmap(dw); w = bmp.width; h = bmp.height; bmp.close();
                } else {
                    const bmp = await createImageBitmap(file); w = bmp.width; h = bmp.height; bmp.close();
                    if (ext==='png') mime='image/png'; else if (ext==='gif') mime='image/gif'; else if (ext==='webp') mime='image/webp';
                }
                if (meta.includeImages || it.name.startsWith('blank_')) zip.addFile(`item/image/${intImgN}`, new Uint8Array(await dw.arrayBuffer()));
                if (isC) { cw = w; ch = h; }
                const iId = isC ? 'cover' : `img-${nStr}`; const escH = intImgN; const xId = isC ? 'p-cover' : `p-${nStr}`; const xN = isC ? 'p-cover.xhtml' : `p-${nStr}.xhtml`;
                zip.addFile(`item/xhtml/${xN}`, enc.encode(EPUB_TEMPLATES.getXhtml(w, h, tit, escH)));
                mI += `<item media-type="${mime}" id="${iId}" href="image/${escH}"${isC ? ' properties="cover-image"' : ''}/>\n`; mX += `<item media-type="application/xhtml+xml" id="${xId}" href="xhtml/${xN}" properties="svg" fallback="${iId}"/>\n`;
                if (isC || it.tocName) { const tl = isC ? tit : this.fs._escapeXml(it.tocName); const nI = isC ? 'cover' : `navPoint-${pO}`; navL += `<li><a href="xhtml/${xN}">${tl}</a></li>\n`; navP += `<navPoint id="${nI}" playOrder="${pO}">\n<navLabel>\n<text>${tl}</text>\n</navLabel>\n<content src="xhtml/${xN}"/>\n</navPoint>\n`; pO++; }
                let spP = ''; if (view === 'spread-rtl') { if (isC) spP = ' properties="rendition:page-spread-center"'; else spP = (idx % 2 === 0) ? ' properties="page-spread-right"' : ' properties="page-spread-left"'; } else if (view === 'spread-ltr') { if (isC) spP = ' properties="rendition:page-spread-center"'; else spP = (idx % 2 === 0) ? ' properties="page-spread-left"' : ' properties="page-spread-right"'; }
                sS += `<itemref linear="yes" idref="${xId}"${spP}/>\n`; onP(idx, items.length, it.name); if (i % 5 === 0) await new Promise(r => setTimeout(r, 0));
            }
            zip.addFile('item/navigation-documents.xhtml', enc.encode(EPUB_TEMPLATES.getNav(tit, navL))); zip.addFile('item/toc.ncx', enc.encode(EPUB_TEMPLATES.getNcx(tit, bId, navP)));
            let dir = 'default'; if (view === 'spread-rtl') dir = 'rtl'; else if (view === 'spread-ltr') dir = 'ltr';
            zip.addFile('item/standard.opf', enc.encode(EPUB_TEMPLATES.getOpf({ title:tit, titleRuby:titR, author:aut, authorRuby:autR, publisher:pub, publisherRuby:pubR, bookId:bId, modifiedDate:mDate, coverW:cw, coverH:ch, manifestImage:mI, manifestXhtml:mX, direction:dir, spineStr:sS })));
            const blob = zip.finish();
            if (meta.exportOrder) { const oT = items.map(it => it.tocName ? `${it.name}\t${it.tocName}` : it.name).join('\n'); const tA = document.createElement('a'); tA.href = URL.createObjectURL(new Blob([oT], { type: 'text/plain' })); tA.download = sName.replace('.epub', '_order.txt'); tA.click(); setTimeout(() => URL.revokeObjectURL(tA.href), 1000); }
            if (handle) { const w = await handle.createWritable(); await w.write(blob); await w.close(); } else { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = sName; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); } return { success: true, filename: sName };
        }
    }


    return Object.freeze({ ZipDocument, EpubGenerator, imageTools: new EpubImageTools() });
})();
