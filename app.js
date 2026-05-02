document.addEventListener('DOMContentLoaded', () => {
    const USER_SETTINGS = {
        msgSaving: '保存中... {current} / {total}', msgSavingPDF: 'PDF生成中... {current} / {total}', msgSavingEpub: 'EPUB生成中... {current} / {total}',
        validExts: ['jpg', 'jpeg', 'png', 'gif', 'webp'], msgFallbackLoad: 'File System API非対応。標準のファイル選択を使用します。',
        msgFallbackSave: 'File System API非対応。ZIPにまとめて保存します。', msgConfirmReset: '本当にリセットしてもよろしいですか？\n編集中のデータはすべて失われます。'
    };

    class UIManager {
        constructor(onRequestImage, onReleaseImage) {
            this.onRequestImage = onRequestImage; this.onReleaseImage = onReleaseImage;
            this.emptyMessage = document.getElementById('empty-message'); this.btnExecute = document.getElementById('btn-execute');
            this.btnUndo = document.getElementById('btn-undo'); this.btnRedo = document.getElementById('btn-redo');
            this.btnReset = document.getElementById('btn-reset'); this.btnSetToc = document.getElementById('btn-set-toc');
            this.btnAddBlank = document.getElementById('btn-add-blank'); this.btnDelete = document.getElementById('btn-delete');
            this.btnBatchCrop = document.getElementById('btn-batch-crop');
            this.currentFolderName = document.getElementById('current-folder-name');
            this.btnExportOrder = document.getElementById('btn-export-order'); this.btnExportSettings = document.getElementById('btn-export-settings');
            this.btnRestoreOrder = document.getElementById('btn-restore-order');
            this.restoreModal = document.getElementById('restore-modal'); this.restoreBtnClose = document.getElementById('restore-btn-close');
            this.restoreList = document.getElementById('restore-list'); this.restoreCheckAll = document.getElementById('restore-check-all');
            this.btnDeleteSelectedCache = document.getElementById('btn-delete-selected-cache'); this.restoreSortMode = document.getElementById('restore-sort-mode');
            this.restoreBtnClose.addEventListener('click', () => this.restoreModal.style.display = 'none');
            this.outputFilename = document.getElementById('output-filename'); this.saveFormatSelect = document.getElementById('save-format');
            this.pdfOptions = document.getElementById('pdf-options'); this.pdfQuality = document.getElementById('pdf-quality');
            this.resizeModeSelect = document.getElementById('resize-mode'); this.resizeBaseSelect = document.getElementById('resize-base');
            this.resizeModeSelect.addEventListener('change', (e) => { this.resizeBaseSelect.disabled = e.target.value === 'none'; });
            
            const ribbonGroups = document.querySelectorAll('.ribbon-group');
            ribbonGroups.forEach(group => {
                group.addEventListener('click', (e) => {
                    if (e.target.closest('.ribbon-items')) { if (e.target.matches('button, button *')) ribbonGroups.forEach(g => g.classList.remove('active')); return; }
                    const isActive = group.classList.contains('active'); ribbonGroups.forEach(g => g.classList.remove('active')); if (!isActive) group.classList.add('active');
                });
            });
            document.addEventListener('click', (e) => { if (!e.target.closest('.ribbon-group')) ribbonGroups.forEach(g => g.classList.remove('active')); });
            
            this.saveFormatSelect.addEventListener('change', (e) => {
                const val = e.target.value; const isPdf = val.includes('pdf');
                if (val === 'pdf-sheet') { this.pdfOptions.style.display = 'none'; this.pdfQuality.value = 100; } 
                else { this.pdfOptions.style.display = isPdf ? 'flex' : 'none'; if (isPdf && this.pdfQuality.value === '100') this.pdfQuality.value = 30; }
            });
            
            this.viewModeSelect = document.getElementById('view-mode'); this.sizeSlider = document.getElementById('size-slider');
            this.mainArea = document.querySelector('.main-area'); this.mainGrid = document.getElementById('main-grid');
            this.sidebarList = document.getElementById('sidebar-list'); this.progressArea = document.getElementById('progress-area');
            this.progressBar = document.getElementById('progress-bar'); this.progressText = document.getElementById('progress-text');
            this.btnManual = document.getElementById('btn-manual'); this.manualModal = document.getElementById('manual-modal'); this.manualBtnClose = document.getElementById('manual-btn-close');
            
            const containerWidth = this.mainArea.clientWidth || window.innerWidth * 0.75;
            let initialThumbSize = Math.floor((containerWidth - 35) / 10); if (initialThumbSize < 80) initialThumbSize = 80; if (initialThumbSize > 300) initialThumbSize = 300;
            this.sizeSlider.value = initialThumbSize; document.documentElement.style.setProperty('--thumb-size', `${initialThumbSize}px`);
            
            this.btnManual.addEventListener('click', () => this.manualModal.style.display = 'flex');
            this.manualBtnClose.addEventListener('click', () => this.manualModal.style.display = 'none');
            this.manualModal.addEventListener('click', (e) => { if (e.target === this.manualModal) this.manualModal.style.display = 'none'; });
            this.themeToggle = document.getElementById('theme-toggle'); this.themeToggle.addEventListener('click', () => this.toggleTheme());
            this.viewModeSelect.addEventListener('change', (e) => this.changeViewMode(e.target.value));
            this.sizeSlider.addEventListener('input', (e) => { document.documentElement.style.setProperty('--thumb-size', `${e.target.value}px`); this.adjustGridWidth(); });
            this.resizeObserver = new ResizeObserver(() => this.adjustGridWidth()); this.resizeObserver.observe(this.mainArea);
        }   
        
        async loadAllThumbnails(fileItems) {
            this.currentLoadSession = Date.now(); const session = this.currentLoadSession;
            for (const item of fileItems) {
                if (session !== this.currentLoadSession) break;
                if (!item.objectUrl) {
                    const url = await this.onRequestImage(item.id);
                    if (session !== this.currentLoadSession) break;
                    if (url) { const img = this.mainGrid.querySelector(`img[data-id="${item.id}"]`); if (img) img.src = url; }
                }
            }
        }
        
        adjustGridWidth() {
            if (this.viewModeSelect.value === 'grid') { this.mainGrid.style.width = 'auto'; this.mainGrid.style.maxWidth = 'none'; return; }
            const cw = this.mainArea.clientWidth - 10; const ts = parseInt(this.sizeSlider.value, 10);
            let pc = Math.floor(cw / ((ts * 2) + 5)); if (pc < 1) pc = 1;
            this.mainGrid.style.width = `${(pc * ((ts * 2) + 5)) + 1}px`; this.mainGrid.style.maxWidth = 'none';
        }
        
        toggleTheme() { document.body.classList.toggle('light-mode'); this.themeToggle.innerHTML = document.body.classList.contains('light-mode') ? '<span class="icon">🌙</span><span class="label">テーマ</span>' : '<span class="icon">☀</span><span class="label">テーマ</span>'; }
        
        changeViewMode(mode) {
            this.mainGrid.className = 'thumb-grid'; 
            if (mode === 'spread-rtl') this.mainGrid.classList.add('mode-spread', 'mode-spread-rtl'); else if (mode === 'spread-ltr') this.mainGrid.classList.add('mode-spread', 'mode-spread-ltr');
            this.adjustGridWidth();
        }
        
        updateProgress(percent, text) {
            if (percent === 0 && text === '') this.progressArea.style.display = 'none';
            else { this.progressArea.style.display = 'block'; this.progressBar.style.width = Math.floor(percent) + '%'; this.progressText.textContent = text; }
        }
        
        renderItems(fileItems) {
            this.mainGrid.innerHTML = ''; this.sidebarList.innerHTML = '';
            this.emptyMessage.style.display = fileItems.length > 0 ? 'none' : 'flex'; this.mainGrid.style.display = fileItems.length > 0 ? '' : 'none';
            const fMain = document.createDocumentFragment(); const fSide = document.createDocumentFragment();
            fileItems.forEach(item => {
                const tDiv = document.createElement('div'); tDiv.className = 'thumb-item'; tDiv.dataset.id = item.id; tDiv.draggable = true;
                if (item.tocName) { const b = document.createElement('div'); b.className = 'toc-badge'; b.textContent = item.tocName; tDiv.appendChild(b); }
                const img = document.createElement('img'); img.dataset.id = item.id; if (item.objectUrl) { img.decoding = "async"; img.src = item.objectUrl; }
                const nDiv = document.createElement('div'); nDiv.className = 'name'; nDiv.textContent = item.name;
                tDiv.appendChild(img); tDiv.appendChild(nDiv); fMain.appendChild(tDiv);
                const lDiv = document.createElement('div'); lDiv.className = 'list-item'; lDiv.dataset.id = item.id; lDiv.textContent = item.name; lDiv.draggable = true; fSide.appendChild(lDiv);
            });
            this.mainGrid.appendChild(fMain); this.sidebarList.appendChild(fSide); this.adjustGridWidth(); this.loadAllThumbnails(fileItems);
        }
        
        setButtonsState(isProcessing, hasFiles) {
            this.emptyMessage.style.pointerEvents = isProcessing ? 'none' : 'auto'; this.emptyMessage.style.opacity = isProcessing ? '0.5' : '1';
            this.btnExecute.disabled = isProcessing || !hasFiles; this.btnReset.disabled = isProcessing; this.viewModeSelect.disabled = isProcessing;
            this.saveFormatSelect.disabled = isProcessing; this.pdfQuality.disabled = isProcessing; this.outputFilename.disabled = isProcessing;
            this.resizeModeSelect.disabled = isProcessing; this.resizeBaseSelect.disabled = isProcessing || this.resizeModeSelect.value === 'none';
            this.btnSetToc.disabled = isProcessing || !hasFiles; this.btnAddBlank.disabled = isProcessing || !hasFiles; this.btnDelete.disabled = isProcessing || !hasFiles;
            this.btnBatchCrop.disabled = isProcessing || !hasFiles;
            this.btnExportOrder.disabled = isProcessing || !hasFiles; this.btnRestoreOrder.disabled = isProcessing || !hasFiles; this.btnExportSettings.disabled = isProcessing;
            if (isProcessing) { this.btnUndo.disabled = true; this.btnRedo.disabled = true; }
        }
        
        clear() {
            this.mainGrid.innerHTML = ''; this.sidebarList.innerHTML = ''; this.currentLoadSession = null; this.updateProgress(0, ''); this.setButtonsState(false, false);
            if (this.currentFolderName) this.currentFolderName.textContent = ''; this.emptyMessage.style.display = 'flex'; this.mainGrid.style.display = 'none';
        }
        
        showToast(message, isError = false) {
            let container = document.getElementById('toast-container');
            if (!container) { container = document.createElement('div'); container.id = 'toast-container'; document.body.appendChild(container); }
            const toast = document.createElement('div'); toast.className = `toast ${isError ? 'error' : ''}`; toast.textContent = message;
            toast.addEventListener('click', () => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 300); });
            container.appendChild(toast); requestAnimationFrame(() => toast.classList.add('show'));
            setTimeout(() => { if (toast.parentElement) { toast.classList.remove('show'); setTimeout(() => toast.remove(), 300); } }, 3000);
        }
    }

    class EpubMetadataModal {
        constructor() {
            this.overlay = document.getElementById('epub-modal');
            this.inTitle = document.getElementById('epub-title'); this.inTitleRuby = document.getElementById('epub-title-ruby');
            this.inAuthor = document.getElementById('epub-author'); this.inAuthorRuby = document.getElementById('epub-author-ruby');
            this.inPublisher = document.getElementById('epub-publisher'); this.inPublisherRuby = document.getElementById('epub-publisher-ruby');
            this.inBookId = document.getElementById('epub-bookid'); this.inModified = document.getElementById('epub-modified');
            this.chkIncludeImages = document.getElementById('epub-include-images'); this.chkExportOrder = document.getElementById('epub-export-order'); this.chkExportSettings = document.getElementById('epub-export-settings');
            this.savedData = { title:'', titleRuby:'', author:'', authorRuby:'', publisher:'', publisherRuby:'', bookId:'', modified:'', includeImages:true, exportOrder:false, exportSettings:false };
            document.getElementById('epub-btn-reset').addEventListener('click', () => {
                this.inTitle.value = ''; this.inTitleRuby.value = ''; this.inAuthor.value = ''; this.inAuthorRuby.value = '';
                this.inPublisher.value = ''; this.inPublisherRuby.value = ''; this.inBookId.value = ''; this.inModified.value = '';
                this.chkIncludeImages.checked = true; this.chkExportOrder.checked = false; this.chkExportSettings.checked = false;
                this.savedData = { title:'', titleRuby:'', author:'', authorRuby:'', publisher:'', publisherRuby:'', bookId:'', modified:'', includeImages:true, exportOrder:false, exportSettings:false };
            });
            document.getElementById('epub-btn-close').addEventListener('click', () => { this.savedData = this.getCurrentData(); this.hide(); if (this.rejectFunc) this.rejectFunc(new Error('cancel')); });
            document.getElementById('epub-btn-start').addEventListener('click', () => {
                this.savedData = {
                    title: this.inTitle.value, titleRuby: this.inTitleRuby.value, author: this.inAuthor.value, authorRuby: this.inAuthorRuby.value,
                    publisher: this.inPublisher.value, publisherRuby: this.inPublisherRuby.value, bookId: this.inBookId.value || 'urn:uuid:' + this._generateUUID(),
                    modified: this.inModified.value, includeImages: this.chkIncludeImages.checked, exportOrder: this.chkExportOrder.checked, exportSettings: this.chkExportSettings.checked
                };
                this.hide(); if (this.resolveFunc) this.resolveFunc(this.savedData);
            });
        }
        _generateUUID() { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID(); return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8); return v.toString(16); }); }
        show(defaultTitle = '') {
            this.inTitle.value = defaultTitle || this.savedData.title || ''; this.inTitleRuby.value = this.savedData.titleRuby;
            this.inAuthor.value = this.savedData.author; this.inAuthorRuby.value = this.savedData.authorRuby;
            this.inPublisher.value = this.savedData.publisher; this.inPublisherRuby.value = this.savedData.publisherRuby;
            this.inBookId.value = this.savedData.bookId.startsWith('urn:uuid:') ? '' : this.savedData.bookId; this.inModified.value = this.savedData.modified;
            this.chkIncludeImages.checked = this.savedData.includeImages; this.chkExportOrder.checked = this.savedData.exportOrder; this.chkExportSettings.checked = this.savedData.exportSettings === true;
            this.overlay.style.display = 'flex'; return new Promise((resolve, reject) => { this.resolveFunc = resolve; this.rejectFunc = reject; });
        }
        hide() { this.overlay.style.display = 'none'; }
        getCurrentData() {
            return {
                title: this.inTitle.value, titleRuby: this.inTitleRuby.value, author: this.inAuthor.value, authorRuby: this.inAuthorRuby.value,
                publisher: this.inPublisher.value, publisherRuby: this.inPublisherRuby.value, bookId: this.inBookId.value, modified: this.inModified.value,
                includeImages: this.chkIncludeImages.checked, exportOrder: this.chkExportOrder.checked, exportSettings: this.chkExportSettings.checked
            };
        }
        setSavedData(data) {
            this.savedData = { ...this.savedData, ...data };
            this.inTitle.value = this.savedData.title || ''; this.inTitleRuby.value = this.savedData.titleRuby || '';
            this.inAuthor.value = this.savedData.author || ''; this.inAuthorRuby.value = this.savedData.authorRuby || '';
            this.inPublisher.value = this.savedData.publisher || ''; this.inPublisherRuby.value = this.savedData.publisherRuby || '';
            this.inBookId.value = this.savedData.bookId || ''; this.inModified.value = this.savedData.modified || '';
            this.chkIncludeImages.checked = this.savedData.includeImages !== false; this.chkExportOrder.checked = this.savedData.exportOrder === true; this.chkExportSettings.checked = this.savedData.exportSettings === true;
        }
    }

    class SortManager {
        constructor(ui, onOrderChanged, onExtDrop) { this.ui = ui; this.onOrderChanged = onOrderChanged; this.onExternalFilesDropped = onExtDrop; this.lastSelectedId = null; this.markerTarget = null; this.boundEvents =[]; this.dragOverTicking = false; }
        init() { this.destroy(); this.bindEvents(this.ui.mainGrid, true); this.bindEvents(this.ui.sidebarList, false); }
        bindEvents(container, isMain) {
            const onClick = (e) => {
                const item = e.target.closest('.thumb-item, .list-item'); if (!item) return; const id = item.dataset.id; const isSelected = item.classList.contains('selected');
                const allItems = Array.from(container.children).filter(el => el.dataset.id);
                if (e.shiftKey && this.lastSelectedId) {
                    const ids = allItems.map(i => i.dataset.id); const start = ids.indexOf(this.lastSelectedId); const end = ids.indexOf(id);
                    if (start !== -1 && end !== -1) { const [min, max] =[Math.min(start, end), Math.max(start, end)]; this.clearSelection(); for (let i = min; i <= max; i++) this.selectById(ids[i], true); } 
                    else { this.clearSelection(); this.selectById(id, true); this.lastSelectedId = id; }
                } else if (e.ctrlKey || e.metaKey) { this.selectById(id, !isSelected); this.lastSelectedId = id; } 
                else { this.clearSelection(); this.selectById(id, true); this.lastSelectedId = id; }
            };
            const onDragStart = (e) => {
                const item = e.target.closest('.thumb-item, .list-item'); if (!item) return;
                if (!item.classList.contains('selected')) { this.clearSelection(); this.selectById(item.dataset.id, true); }
                const sEls = Array.from(document.querySelectorAll('.selected')); sEls.forEach(el => el.classList.add('dragging'));
                e.dataTransfer.setData('text/plain', JSON.stringify([...new Set(sEls.map(el => el.dataset.id))])); e.dataTransfer.effectAllowed = 'move';
            };
            const onDragEnd = () => { document.querySelectorAll('.dragging').forEach(el => el.classList.remove('dragging')); this.removeMarker(); };
            const onDragOver = (e) => {
                e.preventDefault(); const isExt = e.dataTransfer.types && (e.dataTransfer.types.includes('Files') || e.dataTransfer.types.includes('application/x-moz-file')); e.dataTransfer.dropEffect = isExt ? 'copy' : 'move';
                if (!this.dragOverTicking) {
                    requestAnimationFrame(() => {
                        const sT = isMain ? this.ui.mainArea : container.parentElement; const r = sT.getBoundingClientRect();
                        if (e.clientY < r.top + 50) sT.scrollTop -= 15; else if (e.clientY > r.bottom - 50) sT.scrollTop += 15;
                        if (e.clientX < r.left + 50) sT.scrollLeft -= 15; else if (e.clientX > r.right - 50) sT.scrollLeft += 15;
                        const target = e.target.closest('.thumb-item, .list-item');
                        if (!target || (!isExt && target.classList.contains('selected'))) { this.removeMarker(); this.dragOverTicking = false; return; }
                        this.removeMarker(); const rect = target.getBoundingClientRect();
                        if (isMain) {
                            if ((e.clientX - rect.left) < (rect.width / 2)) { target.classList.add('drop-left'); this.markerTarget = { el: target, pos: 'left' }; } 
                            else { target.classList.add('drop-right'); this.markerTarget = { el: target, pos: 'right' }; }
                        } else {
                            if ((e.clientY - rect.top) < (rect.height / 2)) { target.classList.add('drop-top'); this.markerTarget = { el: target, pos: 'top' }; } 
                            else { target.classList.add('drop-bottom'); this.markerTarget = { el: target, pos: 'bottom' }; }
                        }
                        this.dragOverTicking = false;
                    });
                    this.dragOverTicking = true;
                }
            };
            const onDrop = (e) => {
                e.preventDefault(); e.stopPropagation(); let refId = null; let isLogicalBefore = false;
                if (this.markerTarget) {
                    refId = this.markerTarget.el.dataset.id;
                    if (isMain) isLogicalBefore = container.classList.contains('mode-spread-rtl') ? (this.markerTarget.pos === 'right') : (this.markerTarget.pos === 'left');
                    else isLogicalBefore = (this.markerTarget.pos === 'top');
                } else { if (!(e.dataTransfer.types && (e.dataTransfer.types.includes('Files') || e.dataTransfer.types.includes('application/x-moz-file')))) return; }
                let isInternal = false;
                try { const td = e.dataTransfer.getData('text/plain'); if (td) { const ids = JSON.parse(td); if (Array.isArray(ids)) { this.onOrderChanged(ids, refId, isLogicalBefore); isInternal = true; } } } catch(err) {}
                if (!isInternal && e.dataTransfer.files && e.dataTransfer.files.length > 0) this.onExternalFilesDropped(e.dataTransfer.items || e.dataTransfer.files, refId, isLogicalBefore);
                this.removeMarker();
            };
            const onDragLeave = (e) => { if (!container.contains(e.relatedTarget)) this.removeMarker(); };
            container.addEventListener('click', onClick); container.addEventListener('dragstart', onDragStart); container.addEventListener('dragend', onDragEnd);
            container.addEventListener('dragover', onDragOver); container.addEventListener('drop', onDrop); container.addEventListener('dragleave', onDragLeave);
            this.boundEvents.push({el:container,type:'click',fn:onClick}, {el:container,type:'dragstart',fn:onDragStart}, {el:container,type:'dragend',fn:onDragEnd}, {el:container,type:'dragover',fn:onDragOver}, {el:container,type:'drop',fn:onDrop}, {el:container,type:'dragleave',fn:onDragLeave});
        }
        removeMarker() { document.querySelectorAll('.drop-left,.drop-right,.drop-top,.drop-bottom').forEach(el => el.classList.remove('drop-left','drop-right','drop-top','drop-bottom')); this.markerTarget = null; }
        selectById(id, isS) { const m = this.ui.mainGrid.querySelector(`[data-id="${id}"]`); const l = this.ui.sidebarList.querySelector(`[data-id="${id}"]`); if (isS) { if(m)m.classList.add('selected'); if(l)l.classList.add('selected'); } else { if(m)m.classList.remove('selected'); if(l)l.classList.remove('selected'); } }
        clearSelection() { document.querySelectorAll('.selected').forEach(el => el.classList.remove('selected')); }
        destroy() { this.removeMarker(); this.boundEvents.forEach(({el,type,fn})=>el.removeEventListener(type,fn)); this.boundEvents=[]; }
    }

    class PDFDocument {
        constructor(dir = 'L2R') { this.parts =[]; this.objects =[]; this.offsets =[]; this.offset = 0; this.dir = dir; this.addPart("%PDF-1.3\n%\xBE\xE2\xAE\xCE\n"); this.catalogId = this.allocObj(); this.pagesId = this.allocObj(); this.pageIds =[]; }
        allocObj() { this.objects.push(null); return this.objects.length; }
        addPart(data) { if (typeof data === 'string') { const bytes = new TextEncoder().encode(data); this.parts.push(bytes); this.offset += bytes.length; } else { this.parts.push(data); this.offset += data.length; } }
        startObj(id) { this.offsets[id] = this.offset; this.addPart(`${id} 0 obj\n`); } endObj() { this.addPart("\nendobj\n"); }
        async addImagePage(blob, w, h) {
            const pId = this.allocObj(), cId = this.allocObj(), iId = this.allocObj(); this.pageIds.push(pId);
            this.startObj(pId); this.addPart(`<< /Type /Page /Parent ${this.pagesId} 0 R /MediaBox[0 0 ${w} ${h}] /Contents ${cId} 0 R /Resources << /XObject << /I${iId} ${iId} 0 R >> >> >>`); this.endObj();
            const cStr = `q ${w} 0 0 ${h} 0 0 cm /I${iId} Do Q`; this.startObj(cId); this.addPart(`<< /Length ${cStr.length} >>\nstream\n${cStr}\nendstream`); this.endObj();
            const buf = new Uint8Array(await blob.arrayBuffer());
            this.startObj(iId); this.addPart(`<< /Type /XObject /Subtype /Image /Width ${w} /Height ${h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${buf.length} >>\nstream\n`); this.addPart(buf); this.addPart(`\nendstream`); this.endObj();
        }
        async addThumbnailPage(pData, tw, th) {
            const pId = this.allocObj(), cId = this.allocObj(); this.pageIds.push(pId); const iIds =[]; let xDict = "<< ";
            for (let i=0; i<pData.length; i++) { const id = this.allocObj(); iIds.push(id); xDict += `/I${id} ${id} 0 R `; } xDict += ">>";
            this.startObj(pId); this.addPart(`<< /Type /Page /Parent ${this.pagesId} 0 R /MediaBox[0 0 ${tw} ${th}] /Contents ${cId} 0 R /Resources << /XObject ${xDict} >> >>`); this.endObj();
            let cStr = `q 1 1 1 rg 0 0 ${tw} ${th} re f Q\n`;
            for (let i=0; i<pData.length; i++) { const it = pData[i]; cStr += `q ${it.pdfW} 0 0 ${it.pdfH} ${it.pdfX} ${it.pdfY} cm /I${iIds[i]} Do Q\n`; }
            this.startObj(cId); this.addPart(`<< /Length ${cStr.length} >>\nstream\n${cStr}\nendstream`); this.endObj();
            for (let i=0; i<pData.length; i++) {
                const it = pData[i]; const buf = new Uint8Array(await it.blob.arrayBuffer());
                this.startObj(iIds[i]); this.addPart(`<< /Type /XObject /Subtype /Image /Width ${it.canvasW} /Height ${it.canvasH} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${buf.length} >>\nstream\n`); this.addPart(buf); this.addPart(`\nendstream`); this.endObj();
            }
        }
        finish() {
            this.startObj(this.catalogId); this.addPart(`<< /Type /Catalog /Pages ${this.pagesId} 0 R /ViewerPreferences << /Direction ${this.dir==='R2L'?'/R2L':'/L2R'} >> >>`); this.endObj();
            this.startObj(this.pagesId); this.addPart(`<< /Type /Pages /Kids[${this.pageIds.map(id => id + ' 0 R').join(' ')}] /Count ${this.pageIds.length} >>`); this.endObj();
            const xrOff = this.offset; this.addPart("xref\n"); this.addPart(`0 ${this.objects.length + 1}\n`); this.addPart("0000000000 65535 f \r\n");
            for (let i=1; i<=this.objects.length; i++) { const off = this.offsets[i] || 0; this.addPart(String(off).padStart(10, '0') + " 00000 n \r\n"); }
            this.addPart("trailer\n"); this.addPart(`<< /Size ${this.objects.length + 1} /Root ${this.catalogId} 0 R >>\n`); this.addPart("startxref\n"); this.addPart(`${xrOff}\n`); this.addPart("%%EOF\n");
            const tot = this.parts.reduce((sum, p) => sum + p.length, 0); const res = new Uint8Array(tot); let pos = 0; for (const p of this.parts) { res.set(p, pos); pos += p.length; }
            return new Blob([res], { type: 'application/pdf' });
        }
    }

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

    class FileSystemManager {
        async calculateBaseDimensions(files, bType, onP) {
            let ws = [], hs = [];
            for (let i=0; i<files.length; i++) {
                const f = files[i].editedBlob || await files[i].handle.getFile(); const bmp = await createImageBitmap(f);
                ws.push(bmp.width); hs.push(bmp.height); bmp.close(); if (onP) onP(i+1, files.length);
            }
            let bw=0, bh=0; if (bType==='max') { bw=Math.max(...ws); bh=Math.max(...hs); } else if (bType==='min') { bw=Math.min(...ws); bh=Math.min(...hs); } else if (bType==='avg') { bw=Math.round(ws.reduce((a,b)=>a+b,0)/ws.length); bh=Math.round(hs.reduce((a,b)=>a+b,0)/hs.length); }
            return { baseW:bw, baseH:bh };
        }
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
        async selectDirectory() { return await window.showDirectoryPicker({ mode: 'readwrite' }); }
        async selectDirectoryFallback() {
            return new Promise(resolve => {
                const input = document.createElement('input'); input.type = 'file'; input.webkitdirectory = true; input.multiple = true; input.onchange = (e) => resolve(Array.from(e.target.files));
                window.addEventListener('focus', function onFocus(){ window.removeEventListener('focus', onFocus); setTimeout(()=>resolve(Array.from(input.files||[])),300); }, { once: true }); input.click();
            });
        }
        async loadImages(dirHandle) {
            const items =[]; let count = 0;
            for await (const entry of dirHandle.values()) {
                if (entry.kind === 'file' && !entry.name.startsWith('.')) {
                    if (USER_SETTINGS.validExts.includes(entry.name.split('.').pop().toLowerCase())) items.push({ id: entry.name, name: entry.name, handle: entry, objectUrl: null, tocName: null });
                }
                if (++count % 100 === 0) await new Promise(r => setTimeout(r, 0));
            }
            items.sort((a,b)=>a.name.localeCompare(b.name, undefined, {numeric:true})); return items;
        }
        async loadImagesFallback(files) {
            const items =[];
            for (let i=0; i<files.length; i++) {
                const file = files[i]; if (file.name.startsWith('.')) continue;
                if (USER_SETTINGS.validExts.includes(file.name.split('.').pop().toLowerCase())) items.push({ id: file.webkitRelativePath || file.name, name: file.name, handle: { getFile: async () => file }, objectUrl: null, tocName: null });
                if (i % 100 === 0) await new Promise(r => setTimeout(r, 0));
            }
            items.sort((a,b)=>a.name.localeCompare(b.name, undefined, {numeric:true})); return items;
        }
        async saveRenamedFiles(tDir, items, onP, prefix='', rOpts=null, useOrig=false) {
            const pad = Math.max(3, String(items.length).length);
            for (let i=0; i<items.length; i++) {
                const it = items[i]; let ext = it.name.includes('.') ? it.name.split('.').pop() : 'jpg'; if (rOpts && rOpts.mode!=='none') ext = 'jpg'; 
                let nName; if (useOrig) { const bo = it.name.includes('.') ? it.name.substring(0, it.name.lastIndexOf('.')) : it.name; nName = prefix ? `${prefix}_${bo}.${ext}` : `${bo}.${ext}`; }
                else { const numStr = String(i+1).padStart(pad, '0'); nName = prefix ? `${prefix}_${numStr}.${ext}` : `${numStr}.${ext}`; }
                const fh = await tDir.getFileHandle(nName, { create: true }); const w = await fh.createWritable();
                const file = it.editedBlob || await it.handle.getFile();
                if (rOpts && rOpts.mode!=='none') await w.write(await this.processImageResize(file, rOpts)); else await w.write(file);
                await w.close(); onP(i+1, items.length, nName);
            }
        }
        async saveRenamedFilesFallback(items, onP, baseN, prefix='', rOpts=null, useOrig=false) {
            const zip = new ZipDocument(); const pad = Math.max(3, String(items.length).length);
            for (let i=0; i<items.length; i++) {
                const it = items[i]; let ext = it.name.includes('.') ? it.name.split('.').pop() : 'jpg'; if (rOpts && rOpts.mode!=='none') ext = 'jpg'; 
                let nName; if (useOrig) { const bo = it.name.includes('.') ? it.name.substring(0, it.name.lastIndexOf('.')) : it.name; nName = prefix ? `${prefix}_${bo}.${ext}` : `${bo}.${ext}`; }
                else { const numStr = String(i+1).padStart(pad, '0'); nName = prefix ? `${prefix}_${numStr}.${ext}` : `${numStr}.${ext}`; }
                const file = it.editedBlob || await it.handle.getFile();
                if (rOpts && rOpts.mode!=='none') await zip.addFileAsync(nName, await this.processImageResize(file, rOpts)); else await zip.addFileAsync(nName, file);
                onP(i+1, items.length, nName); await new Promise(r => setTimeout(r, 0)); 
            }
            const blob = zip.finish(); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = baseN ? `${baseN}.zip` : 'renamed.zip'; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),1000);
        }
async saveAsPDF(items, q, onP, baseN, rOpts=null, vMode='spread-ltr', useP=true) {
            const defN = baseN ? `${baseN}.pdf` : 'output.pdf'; let handle = null;
            if (useP && 'showSaveFilePicker' in window) { try { handle = await window.showSaveFilePicker({ suggestedName: defN, startIn: 'downloads', types:[{ accept: {'application/pdf':['.pdf']} }] }); } catch (e) { if(e.name==='AbortError')return false; throw e; } }            const blob = await this._runPdfWorker(items, q, onP, rOpts, vMode);
            if (handle) { const w = await handle.createWritable(); await w.write(blob); await w.close(); } 
            else { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = defN; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),1000); } return true;
        }
        async _runPdfWorker(items, q, onP, rOpts, vMode) {
            return new Promise(async (resolve, reject) => {
                const fs =[]; for (let i=0; i<items.length; i++) fs.push({ file: items[i].editedBlob || await items[i].handle.getFile() });
                const code = `${PDFDocument.toString()}\nself.onmessage = async function(e) {
                    const { files, q, rOpts, vMode } = e.data; try {
                        const dir = vMode==='spread-rtl'?'R2L':'L2R'; const pdf = new PDFDocument(dir);
                        for (let i=0; i<files.length; i++) {
                            const bmp = await createImageBitmap(files[i].file); let tw=bmp.width, th=bmp.height, dx=0, dy=0, dw=bmp.width, dh=bmp.height;
                            if (rOpts && rOpts.mode==='fit-width') { tw=rOpts.baseW; th=Math.max(1,Math.round(bmp.height*(rOpts.baseW/bmp.width))); dw=tw; dh=th; }
                            else if (rOpts && rOpts.mode==='fit-height') { tw=Math.max(1,Math.round(bmp.width*(rOpts.baseH/bmp.height))); th=rOpts.baseH; dw=tw; dh=th; }
                            else if (rOpts && rOpts.mode==='pad-white-v') { tw=rOpts.baseW; th=rOpts.baseH; dw=Math.max(1,Math.round(bmp.width*(rOpts.baseH/bmp.height))); dh=rOpts.baseH; dx=(tw-dw)/2; dy=0; }
                            else if (rOpts && rOpts.mode==='pad-white-h') { tw=rOpts.baseW; th=rOpts.baseH; dw=rOpts.baseW; dh=Math.max(1,Math.round(bmp.height*(rOpts.baseW/bmp.width))); dx=0; dy=(th-dh)/2; }
                            const sc = q/100; const w=Math.max(1,Math.floor(tw*sc)), h=Math.max(1,Math.floor(th*sc));
                            const cvs = new OffscreenCanvas(w,h); const ctx = cvs.getContext('2d'); ctx.fillStyle='#fff'; ctx.fillRect(0,0,w,h); ctx.imageSmoothingEnabled=true; ctx.imageSmoothingQuality='high'; ctx.drawImage(bmp, dx*sc, dy*sc, dw*sc, dh*sc); bmp.close();
                            const blob = await cvs.convertToBlob({ type:'image/jpeg', quality:0.8 }); await pdf.addImagePage(blob, w, h);
                            self.postMessage({ type:'progress', current:i+1, total:files.length, info:'ページ '+(i+1) });
                        } self.postMessage({ type:'done', blob:pdf.finish() });
                    } catch(err) { self.postMessage({ type:'error', error:err.message }); }
                };`;
                const blob = new Blob([code], { type:'text/javascript' }); const url = URL.createObjectURL(blob); const worker = new Worker(url);
                worker.onmessage = (e) => { const msg = e.data; if(msg.type==='progress') onP(msg.current, msg.total, msg.info); else if(msg.type==='done') { URL.revokeObjectURL(url); worker.terminate(); resolve(msg.blob); } else if(msg.type==='error') { URL.revokeObjectURL(url); worker.terminate(); reject(new Error(msg.error)); } };
                worker.postMessage({ files:fs, q, rOpts, vMode });
            });
        }
async saveAsThumbnailPDF(lInfo, q, onP, baseN, useP=true) {
            const defN = baseN ? `${baseN}.pdf` : 'thumbnail.pdf'; let handle = null;
            if (useP && 'showSaveFilePicker' in window) { try { handle = await window.showSaveFilePicker({ suggestedName: defN, startIn: 'downloads', types:[{ accept: {'application/pdf':['.pdf']} }] }); } catch (e) { if(e.name==='AbortError')return false; throw e; } }
            const blob = await this._runThumbPdfWorker(lInfo, q, onP);
            if (handle) { const w = await handle.createWritable(); await w.write(blob); await w.close(); } 
            else { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = defN; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),1000); } return true;
        }
        async _runThumbPdfWorker(lInfo, q, onP) {
            return new Promise(async (resolve, reject) => {
                const fData =[]; for (let i=0; i<lInfo.items.length; i++) { const it=lInfo.items[i]; fData.push({ file:it.fileItem.editedBlob||await it.fileItem.handle.getFile(), x:it.x, y:it.y, w:it.w, h:it.h, alignX:it.alignX, index:it.index }); }
                const code = `${PDFDocument.toString()}\nself.onmessage = async function(e) {
                    const { fData, tw, th, q } = e.data; try {
                        const pdf = new PDFDocument(); const pData =[]; const sc = Math.min(1, 14400/tw, 14400/th); const ptw = tw*sc, pth = th*sc;
                        for (let i=0; i<fData.length; i++) {
                            const it = fData[i]; const bmp = await createImageBitmap(it.file); const fsc = Math.min(it.w/bmp.width, it.h/bmp.height);
                            const dw = bmp.width*fsc, dh = bmp.height*fsc; let ox = (it.w-dw)/2; if (it.alignX==='left') ox=0; else if (it.alignX==='right') ox=it.w-dw;
                            const oy = (it.h-dh)/2; const tDh = dh+20; const px = (it.x+ox)*sc; const py = pth - ((it.y+oy+tDh)*sc);
                            const pw = dw*sc, ph = tDh*sc, cw = Math.max(1,Math.floor(dw)), ch = Math.max(1,Math.floor(tDh));
                            const cvs = new OffscreenCanvas(cw,ch); const ctx = cvs.getContext('2d'); ctx.fillStyle='#fff'; ctx.fillRect(0,0,cw,ch); ctx.imageSmoothingEnabled=true; ctx.imageSmoothingQuality='high';
                            const ih = Math.floor(dh); ctx.drawImage(bmp,0,0,cw,ih); bmp.close();
                            ctx.fillStyle='#000'; ctx.font='14px sans-serif'; ctx.textAlign='center'; ctx.textBaseline='top'; ctx.fillText(String(it.index+1).padStart(3,'0'), cw/2, ih+2);
                            const blob = await cvs.convertToBlob({ type:'image/jpeg', quality:0.8 }); pData.push({ blob, pdfX:px, pdfY:py, pdfW:pw, pdfH:ph, canvasW:cw, canvasH:ch });
                            self.postMessage({ type:'progress', current:i+1, total:fData.length, info:'画像処理 '+(i+1) });
                        } await pdf.addThumbnailPage(pData, ptw, pth); self.postMessage({ type:'done', blob:pdf.finish() });
                    } catch(err) { self.postMessage({ type:'error', error:err.message }); }
                };`;
                const blob = new Blob([code], { type:'text/javascript' }); const url = URL.createObjectURL(blob); const worker = new Worker(url);
                worker.onmessage = (e) => { const msg = e.data; if(msg.type==='progress') onP(msg.current, msg.total, msg.info); else if(msg.type==='done') { URL.revokeObjectURL(url); worker.terminate(); resolve(msg.blob); } else if(msg.type==='error') { URL.revokeObjectURL(url); worker.terminate(); reject(new Error(msg.error)); } };
                worker.postMessage({ fData, tw:lInfo.totalWidth, th:lInfo.totalHeight, q });
            });
        }
        async _mergePair(p, rOpts) {
            if (p.length===1) { const f = p[0].editedBlob||await p[0].handle.getFile(); return rOpts && rOpts.mode!=='none'? await this.processImageResize(f,rOpts) : f; }
            const fL = p[0].editedBlob||await p[0].handle.getFile(), fR = p[1].editedBlob||await p[1].handle.getFile();
            const bL = await createImageBitmap(fL), bR = await createImageBitmap(fR); let cw, ch;
            if (rOpts && (rOpts.mode==='pad-white-v'||rOpts.mode==='pad-white-h')) {
                ch = rOpts.baseH; cw = rOpts.baseW*2; const cvs = new OffscreenCanvas(cw,ch); const ctx = cvs.getContext('2d'); ctx.fillStyle='#fff'; ctx.fillRect(0,0,cw,ch);
                let xl,yl,wl,hl,fl; if(rOpts.mode==='pad-white-v'){ fl=rOpts.baseH/bL.height; wl=Math.round(bL.width*fl); hl=rOpts.baseH; xl=(rOpts.baseW-wl)/2; yl=0; } else { fl=rOpts.baseW/bL.width; wl=rOpts.baseW; hl=Math.round(bL.height*fl); xl=0; yl=(rOpts.baseH-hl)/2; } ctx.drawImage(bL,xl,yl,wl,hl);
                let xr,yr,wr,hr,fr; if(rOpts.mode==='pad-white-v'){ fr=rOpts.baseH/bR.height; wr=Math.round(bR.width*fr); hr=rOpts.baseH; xr=rOpts.baseW+(rOpts.baseW-wr)/2; yr=0; } else { fr=rOpts.baseW/bR.width; wr=rOpts.baseW; hr=Math.round(bR.height*fr); xr=rOpts.baseW; yr=(rOpts.baseH-hr)/2; } ctx.drawImage(bR,xr,yr,wr,hr);
                bL.close(); bR.close(); return await cvs.convertToBlob({ type:'image/jpeg', quality:0.9 });
            } else {
                let th = Math.max(bL.height, bR.height); let sl=th/bL.height, sr=th/bR.height; let twl=bL.width*sl, twr=bR.width*sr; let ttw=twl+twr; let fs=1;
                if(rOpts && rOpts.mode==='fit-height') fs=rOpts.baseH/th; else if(rOpts && rOpts.mode==='fit-width') fs=(rOpts.baseW*2)/ttw;
                ch=Math.max(1,Math.round(th*fs)); cw=Math.max(1,Math.round(ttw*fs)); let dwl=Math.round(twl*fs); let dwr=cw-dwl;
                const cvs = new OffscreenCanvas(cw,ch); const ctx = cvs.getContext('2d'); ctx.fillStyle='#fff'; ctx.fillRect(0,0,cw,ch); ctx.drawImage(bL,0,0,dwl,ch); ctx.drawImage(bR,dwl,0,dwr,ch);
                bL.close(); bR.close(); return await cvs.convertToBlob({ type:'image/jpeg', quality:0.9 });
            }
        }
        async saveMergedRenamedFiles(tDir, pairs, onP, prefix='', rOpts=null) {
            const pad = Math.max(3, String(pairs.length).length);
            for (let i=0; i<pairs.length; i++) {
                const blob = await this._mergePair(pairs[i], rOpts); const nName = prefix ? `${prefix}_${String(i+1).padStart(pad,'0')}.jpg` : `${String(i+1).padStart(pad,'0')}.jpg`;
                const fh = await tDir.getFileHandle(nName, { create:true }); const w = await fh.createWritable(); await w.write(blob); await w.close(); onP(i+1, pairs.length, nName);
            }
        }
        async saveMergedRenamedFilesFallback(pairs, onP, baseN, prefix='', rOpts=null) {
            const zip = new ZipDocument(); const pad = Math.max(3, String(pairs.length).length);
            for (let i=0; i<pairs.length; i++) {
                const blob = await this._mergePair(pairs[i], rOpts); const nName = prefix ? `${prefix}_${String(i+1).padStart(pad,'0')}.jpg` : `${String(i+1).padStart(pad,'0')}.jpg`;
                await zip.addFileAsync(nName, blob); onP(i+1, pairs.length, nName); await new Promise(r=>setTimeout(r,0)); 
            }
            const blob = zip.finish(); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = baseN ? `${baseN}.zip` : 'merged.zip'; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),1000);
        }
async saveMergedAsPDF(pairs, q, onP, baseN, rOpts=null, vMode='spread-ltr', useP=true) {
            const defN = baseN ? `${baseN}.pdf` : 'merged.pdf'; let handle = null;
            if (useP && 'showSaveFilePicker' in window) { try { handle = await window.showSaveFilePicker({ suggestedName: defN, startIn: 'downloads', types:[{ accept: {'application/pdf':['.pdf']} }] }); } catch (e) { if(e.name==='AbortError')return false; throw e; } }
            const blob = await this._runMergedPdfWorker(pairs, q, onP, rOpts, vMode);
            if (handle) { const w = await handle.createWritable(); await w.write(blob); await w.close(); } 
            else { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = defN; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),1000); } return true;
        }
        async _runMergedPdfWorker(pairs, q, onP, rOpts, vMode) {
            return new Promise(async (resolve, reject) => {
                const pData =[]; for (let i=0; i<pairs.length; i++) { const p=pairs[i]; if(p.length===1) pData.push([{file:p[0].editedBlob||await p[0].handle.getFile()}]); else pData.push([{file:p[0].editedBlob||await p[0].handle.getFile()},{file:p[1].editedBlob||await p[1].handle.getFile()}]); }
                const code = `${PDFDocument.toString()}\nself.onmessage = async function(e) {
                    const { pairs, q, rOpts, vMode } = e.data; try {
                        const dir = vMode==='spread-rtl'?'R2L':'L2R'; const pdf = new PDFDocument(dir);
                        for (let i=0; i<pairs.length; i++) {
                            const p = pairs[i]; let cvs, w, h;
                            if (p.length===1) {
                                const bmp = await createImageBitmap(p[0].file); let tw=bmp.width, th=bmp.height, dx=0, dy=0;
                                if (rOpts && rOpts.mode==='fit-width'){ tw=rOpts.baseW; th=Math.max(1,Math.round(bmp.height*(rOpts.baseW/bmp.width))); } else if(rOpts && rOpts.mode==='fit-height'){ tw=Math.max(1,Math.round(bmp.width*(rOpts.baseH/bmp.height))); th=rOpts.baseH; } else if(rOpts && rOpts.mode==='pad-white-v'){ tw=rOpts.baseW; th=rOpts.baseH; dx=(tw-Math.round(bmp.width*(rOpts.baseH/bmp.height)))/2; } else if(rOpts && rOpts.mode==='pad-white-h'){ tw=rOpts.baseW; th=rOpts.baseH; dy=(th-Math.round(bmp.height*(rOpts.baseW/bmp.width)))/2; }
                                const sc=q/100; w=Math.max(1,Math.floor(tw*sc)); h=Math.max(1,Math.floor(th*sc)); cvs=new OffscreenCanvas(w,h); const ctx=cvs.getContext('2d'); ctx.fillStyle='#fff'; ctx.fillRect(0,0,w,h); ctx.imageSmoothingEnabled=true; ctx.imageSmoothingQuality='high';
                                if(rOpts && (rOpts.mode==='pad-white-v'||rOpts.mode==='pad-white-h')){ let fw=(rOpts.mode==='pad-white-v')?Math.round(bmp.width*(rOpts.baseH/bmp.height)):rOpts.baseW; let fh=(rOpts.mode==='pad-white-v')?rOpts.baseH:Math.round(bmp.height*(rOpts.baseW/bmp.width)); ctx.drawImage(bmp, dx*sc, dy*sc, fw*sc, fh*sc); } else { ctx.drawImage(bmp,0,0,w,h); } bmp.close();
                            } else {
                                const bL=await createImageBitmap(p[0].file), bR=await createImageBitmap(p[1].file); const sc=q/100;
                                if(rOpts && (rOpts.mode==='pad-white-v'||rOpts.mode==='pad-white-h')){
                                    w=Math.max(1,Math.floor(rOpts.baseW*2*sc)); h=Math.max(1,Math.floor(rOpts.baseH*sc)); cvs=new OffscreenCanvas(w,h); const ctx=cvs.getContext('2d'); ctx.fillStyle='#fff'; ctx.fillRect(0,0,w,h); ctx.imageSmoothingEnabled=true; ctx.imageSmoothingQuality='high';
                                    let fl=(rOpts.mode==='pad-white-v')?rOpts.baseH/bL.height:rOpts.baseW/bL.width; let wl=(rOpts.mode==='pad-white-v')?Math.round(bL.width*fl):rOpts.baseW; let hl=(rOpts.mode==='pad-white-v')?rOpts.baseH:Math.round(bL.height*fl); let xl=(rOpts.mode==='pad-white-v')?(rOpts.baseW-wl)/2:0; let yl=(rOpts.mode==='pad-white-v')?0:(rOpts.baseH-hl)/2; ctx.drawImage(bL,xl*sc,yl*sc,wl*sc,hl*sc);
                                    let fr=(rOpts.mode==='pad-white-v')?rOpts.baseH/bR.height:rOpts.baseW/bR.width; let wr=(rOpts.mode==='pad-white-v')?Math.round(bR.width*fr):rOpts.baseW; let hr=(rOpts.mode==='pad-white-v')?rOpts.baseH:Math.round(bR.height*fr); let xr=(rOpts.mode==='pad-white-v')?rOpts.baseW+(rOpts.baseW-wr)/2:rOpts.baseW; let yr=(rOpts.mode==='pad-white-v')?0:(rOpts.baseH-hr)/2; ctx.drawImage(bR,xr*sc,yr*sc,wr*sc,hr*sc);
                                } else {
                                    let th=Math.max(bL.height,bR.height); let sl=th/bL.height, sr=th/bR.height; let twl=bL.width*sl, twr=bR.width*sr; let ttw=twl+twr; let fs=1; if(rOpts && rOpts.mode==='fit-height')fs=rOpts.baseH/th; else if(rOpts && rOpts.mode==='fit-width')fs=(rOpts.baseW*2)/ttw;
                                    w=Math.max(1,Math.floor(ttw*fs*sc)); h=Math.max(1,Math.floor(th*fs*sc)); const dwl=Math.max(1,Math.floor(twl*fs*sc)); const dwr=w-dwl; cvs=new OffscreenCanvas(w,h); const ctx=cvs.getContext('2d'); ctx.fillStyle='#fff'; ctx.fillRect(0,0,w,h); ctx.imageSmoothingEnabled=true; ctx.imageSmoothingQuality='high'; ctx.drawImage(bL,0,0,dwl,h); ctx.drawImage(bR,dwl,0,dwr,h);
                                } bL.close(); bR.close();
                            }
                            const blob=await cvs.convertToBlob({type:'image/jpeg',quality:0.8}); await pdf.addImagePage(blob,w,h); self.postMessage({type:'progress',current:i+1,total:pairs.length,info:'ページ '+(i+1)});
                        } self.postMessage({type:'done',blob:pdf.finish()});
                    } catch(err) { self.postMessage({type:'error',error:err.message}); }
                };`;
                const blob = new Blob([code], { type:'text/javascript' }); const url = URL.createObjectURL(blob); const worker = new Worker(url);
                worker.onmessage = (e) => { const msg = e.data; if(msg.type==='progress') onP(msg.current, msg.total, msg.info); else if(msg.type==='done') { URL.revokeObjectURL(url); worker.terminate(); resolve(msg.blob); } else if(msg.type==='error') { URL.revokeObjectURL(url); worker.terminate(); reject(new Error(msg.error)); } };
                worker.postMessage({ pairs:pData, q, rOpts, vMode });
            });
        }
        _generateUUID() { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID(); return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8); return v.toString(16); }); }
        _escapeXml(s) { return s.replace(/[<>&'"]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','\'':'&apos;','"':'&quot;'}[c])); }
    }

    class EpubGenerator {
        constructor(fs) { this.fs = fs; }
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

    class ImageEditor {
        constructor(onSave) {
            this.onSave = onSave; this.overlay = document.getElementById('lightbox-overlay');
            this.previewMode = document.getElementById('preview-mode'); this.editorMode = document.getElementById('editor-mode'); this.previewImg = document.getElementById('preview-img');
            this.canvas = document.getElementById('editor-canvas'); this.ctx = this.canvas.getContext('2d');
            this.cropBox = document.getElementById('editor-crop-box'); this.inCropW = document.getElementById('ed-crop-w'); this.inCropH = document.getElementById('ed-crop-h');
            
            this.btnPrev = document.getElementById('btn-prev-img'); this.btnNext = document.getElementById('btn-next-img'); this.pageCounter = document.getElementById('preview-counter');
            this.btnPrev.addEventListener('click', (e) => { e.stopPropagation(); this.navigate(-1); });
            this.btnNext.addEventListener('click', (e) => { e.stopPropagation(); this.navigate(1); });
            document.addEventListener('keydown', (e) => {
                if (this.overlay.style.display === 'flex' && this.previewMode.style.display === 'flex') {
                    if (e.key === 'ArrowLeft') { e.preventDefault(); this.navigate(-1); }
                    else if (e.key === 'ArrowRight') { e.preventDefault(); this.navigate(1); }
                }
            });

            document.getElementById('btn-close-preview').addEventListener('click', () => this.close());
            this.previewMode.addEventListener('click', (e) => { if (e.target.tagName.toLowerCase() !== 'img' && e.target.tagName.toLowerCase() !== 'button') this.close(); });
            document.getElementById('btn-to-editor').addEventListener('click', () => { this.previewMode.style.display='none'; this.editorMode.style.display='flex'; this.renderEditor(); });
            document.getElementById('ed-cancel').addEventListener('click', () => { this.editorMode.style.display='none'; this.previewMode.style.display='flex'; this.state = JSON.parse(JSON.stringify(this.originalState)); });
            document.getElementById('ed-save').addEventListener('click', () => this.save());
            document.getElementById('ed-rot-l').addEventListener('click', () => { this.state.rotate=(this.state.rotate-90)%360; this.renderEditor(); });
            document.getElementById('ed-rot-r').addEventListener('click', () => { this.state.rotate=(this.state.rotate+90)%360; this.renderEditor(); });
            document.getElementById('ed-flip-h').addEventListener('click', () => { this.state.flipH=!this.state.flipH; this.renderEditor(); });
            document.getElementById('ed-flip-v').addEventListener('click', () => { this.state.flipV=!this.state.flipV; this.renderEditor(); });
            document.getElementById('ed-crop-clear').addEventListener('click', () => { this.state.crop=null; this.ratio=null; document.querySelectorAll('.ed-ratio-btn').forEach(b=>b.classList.remove('active')); document.querySelector('.ed-ratio-btn[data-ratio="free"]').classList.add('active'); this.renderEditor(); });
            const ratioBtns = document.querySelectorAll('.ed-ratio-btn');
            ratioBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    ratioBtns.forEach(b => b.classList.remove('active')); btn.classList.add('active');
                    this.ratio = btn.dataset.ratio === 'free' ? null : parseFloat(btn.dataset.ratio); this.applyRatioToCrop();
                });
            });
            this.setupCropEvents();
        }

        async open(item, fileItems = null) {
            if (fileItems) this.fileItems = fileItems; 
            this.currentItem = item; const file = item.originalFile || await item.handle.getFile(); if (!item.originalFile) item.originalFile = file; 
            this.state = item.editState ? JSON.parse(JSON.stringify(item.editState)) : { rotate:0, flipH:false, flipV:false, crop:null };
            this.originalState = JSON.parse(JSON.stringify(this.state)); 
            const prevUrl = URL.createObjectURL(item.editedBlob || file); this.previewImg.src = prevUrl; this.previewImg.onload = () => URL.revokeObjectURL(prevUrl);
            const origUrl = URL.createObjectURL(file); this.img = new Image(); this.img.onload = () => URL.revokeObjectURL(origUrl); this.img.src = origUrl;
            this.previewMode.style.display='flex'; this.editorMode.style.display='none'; this.overlay.style.display='flex';
            this.ratio=null; document.querySelectorAll('.ed-ratio-btn').forEach(b=>b.classList.remove('active')); document.querySelector('.ed-ratio-btn[data-ratio="free"]').classList.add('active');
            
            this.updateNavUI(); 
        }

        updateNavUI() {
            if (!this.fileItems || this.fileItems.length === 0) { this.pageCounter.textContent = '- / -'; return; }
            this.currentIndex = this.fileItems.findIndex(i => i.id === this.currentItem.id);
            this.pageCounter.textContent = `${this.currentIndex + 1} / ${this.fileItems.length}`;
            
            const viewMode = document.getElementById('view-mode').value;
            const hasPrev = this.currentIndex > 0;
            const hasNext = this.currentIndex < this.fileItems.length - 1;
            
            if (viewMode === 'spread-rtl') {
                this.btnPrev.style.opacity = hasNext ? '1' : '0.3'; this.btnPrev.style.pointerEvents = hasNext ? 'auto' : 'none';
                this.btnNext.style.opacity = hasPrev ? '1' : '0.3'; this.btnNext.style.pointerEvents = hasPrev ? 'auto' : 'none';
            } else {
                this.btnPrev.style.opacity = hasPrev ? '1' : '0.3'; this.btnPrev.style.pointerEvents = hasPrev ? 'auto' : 'none';
                this.btnNext.style.opacity = hasNext ? '1' : '0.3'; this.btnNext.style.pointerEvents = hasNext ? 'auto' : 'none';
            }
        }

        navigate(direction) {
            if (!this.fileItems) return;
            
            const viewMode = document.getElementById('view-mode').value;
            if (viewMode === 'spread-rtl') direction = -direction;
            
            const newIdx = this.currentIndex + direction;
            if (newIdx >= 0 && newIdx < this.fileItems.length) {
                this.img = null; 
                this.open(this.fileItems[newIdx], this.fileItems); 
            }
        }

        getBaseSize() { if(!this.img) return {w:0,h:0}; const isRot = Math.abs(this.state.rotate)%180!==0; return {w:isRot?this.img.height:this.img.width, h:isRot?this.img.width:this.img.height}; }
        
        renderEditor() {
            if(!this.img) return; const base = this.getBaseSize(); const c = document.querySelector('.editor-canvas-container');
            const scale = Math.min(1, (c.clientWidth-80)/base.w, (c.clientHeight-80)/base.h);
            this.canvas.width=base.w; this.canvas.height=base.h; this.canvas.style.width=`${base.w*scale}px`; this.canvas.style.height=`${base.h*scale}px`;
            this.ctx.clearRect(0,0,base.w,base.h); this.ctx.save(); this.ctx.translate(base.w/2,base.h/2); this.ctx.rotate(this.state.rotate*Math.PI/180);
            this.ctx.scale(this.state.flipH?-1:1, this.state.flipV?-1:1); this.ctx.drawImage(this.img, -this.img.width/2, -this.img.height/2); this.ctx.restore();
            this.scale = scale; if(!this.state.crop) this.state.crop = {x:0,y:0,w:base.w,h:base.h}; this.updateCropBoxUI();
        }
        updateCropBoxUI() {
            const c = this.state.crop; this.cropBox.style.display = 'block';
            this.cropBox.style.left=`${c.x*this.scale}px`; this.cropBox.style.top=`${c.y*this.scale}px`; this.cropBox.style.width=`${c.w*this.scale}px`; this.cropBox.style.height=`${c.h*this.scale}px`;
            this.inCropW.value = Math.round(c.w); this.inCropH.value = Math.round(c.h);
        }
        applyRatioToCrop() {
            if(!this.ratio||!this.state.crop) return; const base = this.getBaseSize(); let {x,y,w,h} = this.state.crop; const cx = x+w/2; const cy = y+h/2;
            if(w*(1/this.ratio)>h) w=Math.round(h*this.ratio); else h=Math.round(w*(1/this.ratio)); x=Math.round(cx-w/2); y=Math.round(cy-h/2);
            if(x<0) x=0; if(y<0) y=0; if(x+w>base.w) w=base.w-x; if(y+h>base.h) h=base.h-y;
            this.state.crop = {x,y,w,h}; this.updateCropBoxUI();
        }
        setupCropEvents() {
            let isDrag=false, dType=null, sx=0, sy=0, initCrop=null;
            const onDown = (e) => {
                if (e.target.classList.contains('crop-handle')) { dType=e.target.dataset.dir; isDrag=true; sx=e.clientX; sy=e.clientY; initCrop={...this.state.crop}; e.preventDefault(); } 
                else if(e.target===this.cropBox) { dType='move'; isDrag=true; sx=e.clientX; sy=e.clientY; initCrop={...this.state.crop}; e.preventDefault(); } 
                else if(e.target===this.canvas) {
                    dType='new'; isDrag=true; sx=e.clientX; sy=e.clientY; const r = this.canvas.getBoundingClientRect();
                    this.state.crop = {x:(e.clientX-r.left)/this.scale, y:(e.clientY-r.top)/this.scale, w:0, h:0}; initCrop={...this.state.crop}; e.preventDefault();
                }
            };
            const onMove = (e) => {
                if(!isDrag) return; const dx=(e.clientX-sx)/this.scale, dy=(e.clientY-sy)/this.scale; let {x,y,w,h}=initCrop; const base=this.getBaseSize();
                if(dType==='move'){ x+=dx; y+=dy; } else if(dType==='new'){
                    if(dx<0){ x=initCrop.x+dx; w=-dx; }else{ w=dx; } if(dy<0){ y=initCrop.y+dy; h=-dy; }else{ h=dy; }
                } else { if(dType.includes('n')){y+=dy;h-=dy;} if(dType.includes('s')){h+=dy;} if(dType.includes('w')){x+=dx;w-=dx;} if(dType.includes('e')){w+=dx;} }
                if(this.ratio&&dType!=='move'){
                    if(dType==='e'||dType==='w'){ h=w*(1/this.ratio); if(dType.includes('n'))y=initCrop.y+initCrop.h-h; } else if(dType==='s'||dType==='n'){ w=h*this.ratio; if(dType.includes('w'))x=initCrop.x+initCrop.w-w; }
                    else { if(Math.abs(w*(1/this.ratio))>Math.abs(h)) h=w*(1/this.ratio); else w=h*this.ratio; if(dType.includes('n')||(dType==='new'&&dy<0))y=initCrop.y+initCrop.h-h; if(dType.includes('w')||(dType==='new'&&dx<0))x=initCrop.x+initCrop.w-w; }
                }
                if(w<10)w=10; if(h<10)h=10;
                if(x<0){ if(dType==='move') x=0; else { w+=x; x=0; if(this.ratio) h=w*(1/this.ratio); } } if(y<0){ if(dType==='move') y=0; else { h+=y; y=0; if(this.ratio) w=h*this.ratio; } } 
                if(x+w>base.w){ if(dType==='move') x=base.w-w; else { w=base.w-x; if(this.ratio) h=w*(1/this.ratio); } } if(y+h>base.h){ if(dType==='move') y=base.h-h; else { h=base.h-y; if(this.ratio) w=h*this.ratio; } }
                this.state.crop = {x,y,w,h}; this.updateCropBoxUI();
            };
            this.cropBox.addEventListener('mousedown', onDown); this.canvas.addEventListener('mousedown', onDown);
            window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', () => {isDrag=false;});
        }
        async save() {
            const c = this.state.crop; const base = this.getBaseSize();
            if (c && c.x===0 && c.y===0 && Math.abs(c.w-base.w)<2 && Math.abs(c.h-base.h)<2) this.state.crop = null;
            let blob; if (!this.state.crop && this.state.rotate===0 && !this.state.flipH && !this.state.flipV) blob = null;
            else { const cw = c?c.w:base.w; const ch = c?c.h:base.h; const cx = c?c.x:0; const cy = c?c.y:0; const fCvs = new OffscreenCanvas(cw,ch); const fCtx = fCvs.getContext('2d'); fCtx.drawImage(this.canvas,cx,cy,cw,ch,0,0,cw,ch); blob = await fCvs.convertToBlob({type:'image/jpeg',quality:0.95}); }
            this.currentItem.editState = JSON.parse(JSON.stringify(this.state)); this.close(); if(this.onSave) this.onSave(this.currentItem, blob);
        }
        close() { this.overlay.style.display='none'; this.img=null; }
    }

    class App {
        constructor() {
            this.ui = new UIManager((id) => this.getImageUrl(id), (id) => this.releaseImageUrl(id));
            this.fs = new FileSystemManager(); this.epubGen = new EpubGenerator(this.fs);
            this.imageEditor = new ImageEditor((item, blob) => {
                this.saveHistory(); item.editedBlob = blob; this.releaseImageUrl(item.id); this.ui.renderItems(this.fileItems); this.ui.showToast('画像の編集を適用しました。');
            });
            this.sortManager = new SortManager(this.ui, (dId,tId,isB) => this.reorderFiles(dId,tId,isB), (iof,tId,isB) => this.handleExternalDropToItem(iof,tId,isB));
            this.epubModal = new EpubMetadataModal();
            this.dirHandle = null; this.sourceFolderName = null; this.fileItems =[]; this.isProcessing = false; this.historyUndo =[]; this.historyRedo =[];
            this.hasFSApi = 'showDirectoryPicker' in window; if (!this.hasFSApi) console.warn(USER_SETTINGS.msgFallbackLoad);
            this.ui.changeViewMode('spread-rtl'); this.bindEvents();
        }
        saveSettings(bN) {
            try {
                const s = { oF: this.ui.outputFilename.value, sF: this.ui.saveFormatSelect.value, pQ: this.ui.pdfQuality.value, vM: this.ui.viewModeSelect.value, tS: this.ui.sizeSlider.value, rM: this.ui.resizeModeSelect.value, rB: this.ui.resizeBaseSelect.value, eM: this.epubModal.getCurrentData() };
                const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(s)], {type:'application/json'})); a.download = bN ? `${bN}_setting.json` : 'setting.json'; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),1000); this.ui.showToast('設定ファイルを保存しました。');
            } catch (e) { console.error(e); this.ui.showToast('設定の保存に失敗しました。', true); }
        }
        async processLoadSettings(file) {
            try {
                const s = JSON.parse(await file.text());
                if (s.oF!==undefined) this.ui.outputFilename.value=s.oF; if(s.sF){this.ui.saveFormatSelect.value=s.sF; this.ui.saveFormatSelect.dispatchEvent(new Event('change'));}
                if(s.pQ)this.ui.pdfQuality.value=s.pQ; if(s.vM){this.ui.viewModeSelect.value=s.vM; this.ui.changeViewMode(s.vM);} if(s.tS){this.ui.sizeSlider.value=s.tS; this.ui.sizeSlider.dispatchEvent(new Event('input'));}
                if(s.rM){this.ui.resizeModeSelect.value=s.rM; this.ui.resizeModeSelect.dispatchEvent(new Event('change'));} if(s.rB)this.ui.resizeBaseSelect.value=s.rB;
                if(s.eM)this.epubModal.setSavedData(s.eM); this.ui.showToast('設定を復元しました。');
            } catch(e) { console.error(e); this.ui.showToast('設定の読み込みに失敗しました。', true); }
        }
        setProcessingState(isP) { this.isProcessing=isP; this.ui.setButtonsState(isP, this.fileItems.length>0); if(!isP) this.updateHistoryButtons(); }
        async getImageUrl(id) {
            const it = this.fileItems.find(i=>i.id===id); if(!it) return null; if(it.objectUrl) return it.objectUrl; 
            const file = it.editedBlob || await it.handle.getFile();
            if (file.size > 1048576) {
                try { const bmp = await createImageBitmap(file,{resizeWidth:300,resizeQuality:'low'}); const cvs = new OffscreenCanvas(bmp.width,bmp.height); cvs.getContext('2d').drawImage(bmp,0,0); bmp.close(); it.objectUrl = URL.createObjectURL(await cvs.convertToBlob({type:'image/jpeg',quality:0.6})); return it.objectUrl; } catch(e){ it.objectUrl=URL.createObjectURL(file); return it.objectUrl; }
            } else { it.objectUrl=URL.createObjectURL(file); return it.objectUrl; }
        }
        releaseImageUrl(id) { const it = this.fileItems.find(i=>i.id===id); if(it&&it.objectUrl) { URL.revokeObjectURL(it.objectUrl); it.objectUrl=null; } }
        bindEvents() {
            this.ui.emptyMessage.addEventListener('click', () => this.handleSelectFolder()); this.ui.btnExecute.addEventListener('click', () => this.handleExecute());
            this.ui.btnUndo.addEventListener('click', () => this.undo()); this.ui.btnRedo.addEventListener('click', () => this.redo());
            this.ui.btnReset.addEventListener('click', () => this.reset()); this.ui.btnSetToc.addEventListener('click', () => this.handleSetToc()); 
            this.ui.btnAddBlank.addEventListener('click', () => this.handleAddBlank()); this.ui.btnDelete.addEventListener('click', () => this.handleDelete());
            this.ui.btnExportOrder.addEventListener('click', () => this.handleExportOrder()); this.ui.btnRestoreOrder.addEventListener('click', () => this.openRestoreModal()); this.ui.btnExportSettings.addEventListener('click', () => this.handleExportSettings());
            this.ui.restoreCheckAll.addEventListener('change', (e) => { this.ui.restoreList.querySelectorAll('.cache-check').forEach(c=>c.checked=e.target.checked); this.updateCacheDeleteButton(); });
            this.ui.btnDeleteSelectedCache.addEventListener('click', () => this.deleteSelectedCaches()); if(this.ui.restoreSortMode) this.ui.restoreSortMode.addEventListener('change', () => this.renderCacheList());
            const bAs=document.getElementById('btn-auto-sort'), mAs=document.getElementById('auto-sort-modal'), tAs=document.getElementById('auto-sort-text'), cKf=document.getElementById('auto-sort-keep-first');
            bAs.addEventListener('click', () => { tAs.value=''; mAs.style.display='flex'; }); document.getElementById('auto-sort-btn-close').addEventListener('click', () => mAs.style.display='none'); document.getElementById('auto-sort-btn-start').addEventListener('click', () => { mAs.style.display='none'; this.handleAutoSort(tAs.value, cKf.checked); });
            
            this.ui.mainGrid.addEventListener('dblclick', async (e) => { if(this.isProcessing)return; const item=e.target.closest('.thumb-item'); if(!item)return; const fI=this.fileItems.find(i=>i.id===item.dataset.id); if(fI) this.imageEditor.open(fI, this.fileItems); });
            
            this.ui.btnBatchCrop.addEventListener('click', () => { if(document.querySelectorAll('.thumb-item.selected').length===0) return; document.getElementById('batch-crop-modal').style.display='flex'; });
            document.getElementById('batch-crop-preset').addEventListener('change', (e) => { const wI=document.getElementById('batch-crop-w'), hI=document.getElementById('batch-crop-h'); if(e.target.value==='a4-v'){wI.value=2894;hI.value=4093;} else if(e.target.value==='a4-h'){wI.value=4093;hI.value=2894;} else if(e.target.value==='b5-v'){wI.value=2508;hI.value=3541;} else if(e.target.value==='b5-h'){wI.value=3541;hI.value=2508;} });
            document.getElementById('batch-crop-btn-close').addEventListener('click', () => { document.getElementById('batch-crop-modal').style.display='none'; });
            document.getElementById('batch-crop-btn-start').addEventListener('click', async () => {
                document.getElementById('batch-crop-modal').style.display='none';
                const tW=parseInt(document.getElementById('batch-crop-w').value), tH=parseInt(document.getElementById('batch-crop-h').value);
                const sE=Array.from(document.querySelectorAll('.thumb-item.selected')); if(sE.length===0||!tW||!tH) return;
                this.setProcessingState(true); this.saveHistory();
                try {
                    for(let i=0; i<sE.length; i++) {
                        const it=this.fileItems.find(x=>x.id===sE[i].dataset.id); if(!it) continue;
                        const file=it.originalFile||await it.handle.getFile(); if(!it.originalFile) it.originalFile=file;
                        const bmp=await createImageBitmap(file); const iw=bmp.width, ih=bmp.height;
                        const ratio=tW/tH, imgRatio=iw/ih; let cropW, cropH;
                        if (imgRatio > ratio) { cropH=ih; cropW=Math.round(ih*ratio); } else { cropW=iw; cropH=Math.round(iw/ratio); }
                        let cropX=Math.floor((iw-cropW)/2), cropY=Math.floor((ih-cropH)/2);
                        const cvs=new OffscreenCanvas(tW,tH); const ctx=cvs.getContext('2d'); ctx.imageSmoothingEnabled=true; ctx.imageSmoothingQuality='high'; ctx.drawImage(bmp,cropX,cropY,cropW,cropH,0,0,tW,tH); bmp.close();
                        const blob=await cvs.convertToBlob({type:'image/jpeg',quality:0.95});
                        it.editState={rotate:0,flipH:false,flipV:false,crop:{x:cropX,y:cropY,w:cropW,h:cropH}}; it.editedBlob=blob; this.releaseImageUrl(it.id);
                        this.ui.updateProgress(((i+1)/sE.length)*100, `一括トリミング中... ${i+1}/${sE.length}`);
                    }
                    this.ui.renderItems(this.fileItems); this.sortManager.init(); sE.forEach(el=>this.sortManager.selectById(el.dataset.id,true)); this.ui.showToast('一括トリミングを適用しました。');
                } catch(e) { console.error(e); this.ui.showToast('エラーが発生しました。', true); } finally { this.setProcessingState(false); this.ui.updateProgress(0,''); }
            });

            window.addEventListener('beforeunload', (e) => { if (this.isProcessing || this.fileItems.length>0) { e.preventDefault(); e.returnValue='編集中のデータがあります。'; } });
            document.addEventListener('keydown', (e) => {
                if (this.isProcessing || ['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)) return;
                const cmd = navigator.platform.toUpperCase().indexOf('MAC')>=0 ? e.metaKey : e.ctrlKey;
                if(cmd&&e.key.toLowerCase()==='z'){e.preventDefault(); if(e.shiftKey)this.redo(); else this.undo();} else if(cmd&&e.key.toLowerCase()==='y'){e.preventDefault(); this.redo();} else if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault(); this.handleDelete();}
            });
            document.body.addEventListener('dragover', (e) => e.preventDefault());
            document.body.addEventListener('drop', async (e) => {
                e.preventDefault(); if (!e.dataTransfer.types||(!e.dataTransfer.types.includes('Files')&&!e.dataTransfer.types.includes('application/x-moz-file'))||this.isProcessing) return;
                const rF = Array.from(e.dataTransfer.files);
                const sF = rF.find(f=>f.name&&f.name.toLowerCase().endsWith('.json')); if(sF) return await this.processLoadSettings(sF);
                const tF = rF.find(f=>f.name&&f.name.toLowerCase().endsWith('.txt')); if(tF) return await this.applyOrderFromText(await tF.text());
                const items=e.dataTransfer.items; let dD=null; const fH=[], fFb=[]; let hD=false;
                if (this.hasFSApi&&items) {
                    const hP=[]; for (let i=0; i<items.length; i++) if (items[i].kind==='file'&&typeof items[i].getAsFileSystemHandle==='function') hP.push(items[i].getAsFileSystemHandle());
                    const hs=await Promise.all(hP); for (const h of hs) if (h) { if (h.kind==='directory') {hD=true; dD=h; break;} else if(h.kind==='file') fH.push(h); }
                } else { for(let f of rF){ if(!f.name||f.name.startsWith('.'))continue; if(USER_SETTINGS.validExts.includes(f.name.split('.').pop().toLowerCase())) fFb.push(f); else if(!f.type) hD=true; } }
                if(hD&&dD) this.handleLoadDirectory(dD); else if(hD&&!this.hasFSApi){ this.resetMemory(); const fa=Array.from(e.dataTransfer.files); this.sourceFolderName=(fa.length>0&&fa[0].webkitRelativePath)?fa[0].webkitRelativePath.split('/')[0]:null; this.fileItems=await this.fs.loadImagesFallback(fa); this.finalizeLoad(); }
                else { const tFs=this.hasFSApi?fH:fFb; if(tFs.length>0) await this.handleAddFilesToTail(tFs, this.hasFSApi&&fH.length>0); }
            });
        }
        async applyOrderFromText(t, s=false, msg='') {
            const ls = t.split(/\r?\n/).map(l=>l.trim()).filter(l=>l); if(ls.length===0||this.fileItems.length===0) return;
            this.setProcessingState(true); this.saveHistory(); const nI=[], rI=[...this.fileItems];
            for (const l of ls) {
                const ps=l.split('\t'), n=ps[0], tn=ps.length>1?ps[1]:null, idx=rI.findIndex(i=>i.name===n);
                if (idx!==-1) { const it=rI[idx]; it.tocName=tn; nI.push(it); rI.splice(idx,1); }
                else if (n.startsWith('blank_')) {
                    const m=n.match(/^blank_(\d+)x(\d+)_/); if(m) {
                        const w=parseInt(m[1],10), h=parseInt(m[2],10), cvs=new OffscreenCanvas(w,h), ctx=cvs.getContext('2d'); ctx.fillStyle='#fff'; ctx.fillRect(0,0,w,h);
                        const b=await cvs.convertToBlob({type:'image/jpeg',quality:0.9}), df=new File([b],n,{type:'image/jpeg'}), us=n.replace('.jpg','').split('_').pop();
                        nI.push({id:`blank_${us}`, name:n, handle:{getFile:async()=>df}, objectUrl:URL.createObjectURL(df), tocName:tn});
                    }
                }
            }
            nI.push(...rI); this.fileItems=nI; this.ui.renderItems(this.fileItems); this.sortManager.init(); this.setProcessingState(false); if(!s)this.ui.showToast(msg||'テキストから並び順を復元しました。');
        }
        saveHistory() { this.historyUndo.push(this.fileItems.map(i=>({...i}))); this.historyRedo=[]; this.updateHistoryButtons(); }
        undo() { if(this.historyUndo.length===0||this.isProcessing)return; this.fileItems.forEach(i=>this.releaseImageUrl(i.id)); this.historyRedo.push(this.fileItems.map(i=>({...i}))); this.fileItems=this.historyUndo.pop().map(i=>{i.objectUrl=null; return i;}); this.ui.renderItems(this.fileItems); this.sortManager.init(); this.updateHistoryButtons(); this.ui.setButtonsState(false, this.fileItems.length>0); }
        redo() { if(this.historyRedo.length===0||this.isProcessing)return; this.fileItems.forEach(i=>this.releaseImageUrl(i.id)); this.historyUndo.push(this.fileItems.map(i=>({...i}))); this.fileItems=this.historyRedo.pop().map(i=>{i.objectUrl=null; return i;}); this.ui.renderItems(this.fileItems); this.sortManager.init(); this.updateHistoryButtons(); this.ui.setButtonsState(false, this.fileItems.length>0); }
        updateHistoryButtons() { this.ui.btnUndo.disabled=this.historyUndo.length===0||this.isProcessing; this.ui.btnRedo.disabled=this.historyRedo.length===0||this.isProcessing; }
        async handleSelectFolder() { try { if(this.hasFSApi){ await this.handleLoadDirectory(await this.fs.selectDirectory()); } else{ const fs=await this.fs.selectDirectoryFallback(); this.resetMemory(); this.sourceFolderName=(fs.length>0&&fs[0].webkitRelativePath)?fs[0].webkitRelativePath.split('/')[0]:null; this.fileItems=await this.fs.loadImagesFallback(fs); this.finalizeLoad(); } } catch(e){if(e.name!=='AbortError')console.error(e);} }
        async handleLoadDirectory(dh) { this.dirHandle=dh; this.sourceFolderName=dh.name; try{ this.resetMemory(); this.fileItems=await this.fs.loadImages(this.dirHandle); this.finalizeLoad(); } catch(e){ console.error(e); this.ui.showToast('❌ エラー: '+e.message,true); } }
        async finalizeLoad() {
            if(this.fileItems.length===0){this.ui.showToast('❌ 画像がありません。',true); return;} this.ui.renderItems(this.fileItems); if(this.ui.currentFolderName)this.ui.currentFolderName.textContent=this.sourceFolderName?`[ ${this.sourceFolderName} ]`:'';
            this.sortManager.init(); this.historyUndo=[]; this.historyRedo=[]; this.updateHistoryButtons(); this.ui.setButtonsState(false, true);
            if(this.sourceFolderName) { try { const m=JSON.parse(localStorage.getItem('image_sorting_orders')||'[]').find(c=>c.title===this.sourceFolderName); if(m&&m.orderText){await new Promise(r=>setTimeout(r,50)); await this.applyOrderFromText(m.orderText,false,'前回保存された並び順を自動適用しました。');} }catch(e){} }
        }
        reorderFiles(dIds, tId, isB) { this.saveHistory(); const dIs=this.fileItems.filter(i=>dIds.includes(i.id)); let nIs=this.fileItems.filter(i=>!dIds.includes(i.id)); let tI=nIs.findIndex(i=>i.id===tId); if(tI===-1)tI=nIs.length; nIs.splice(isB?tI:tI+1, 0, ...dIs); this.fileItems=nIs; this.ui.renderItems(this.fileItems); this.sortManager.init(); dIds.forEach(id=>this.sortManager.selectById(id,true)); this.sortManager.lastSelectedId=dIds[dIds.length-1]; }
        handleSetToc() {
            const sE=Array.from(document.querySelectorAll('.thumb-item.selected')); if(sE.length===0){this.ui.showToast('画像を選択してください。',true); return;}
            const cT=this.fileItems.find(i=>i.id===sE[0].dataset.id)?.tocName||''; const nT=prompt('目次名を入力してください。空欄で解除します。', cT); if(nT===null)return;
            this.saveHistory(); sE.forEach(e=>{const i=this.fileItems.find(x=>x.id===e.dataset.id); if(i)i.tocName=nT.trim()===''?null:nT.trim();}); this.ui.renderItems(this.fileItems); this.sortManager.init(); sE.forEach(e=>this.sortManager.selectById(e.dataset.id,true));
        }
        async handleAddBlank() {
            const sE=Array.from(document.querySelectorAll('.thumb-item.selected')); if(sE.length===0){this.ui.showToast('画像を選択してください。',true); return;}
            this.setProcessingState(true);
            try {
                this.saveHistory();
                for(let i=sE.length-1; i>=0; i--) {
                    const idx=this.fileItems.findIndex(x=>x.id===sE[i].dataset.id); if(idx===-1)continue;
                    const b=this.fileItems[idx]; const f=b.editedBlob||await b.handle.getFile(); const bmp=await createImageBitmap(f); const w=bmp.width, h=bmp.height; bmp.close();
                    const cvs=new OffscreenCanvas(w,h); const ctx=cvs.getContext('2d'); ctx.fillStyle='#fff'; ctx.fillRect(0,0,w,h); const bl=await cvs.convertToBlob({type:'image/jpeg',quality:0.9});
                    const us=Date.now().toString(36)+Math.random().toString(36).substring(2,5), nN=`blank_${w}x${h}_${us}.jpg`, df=new File([bl],nN,{type:'image/jpeg'});
                    this.fileItems.splice(idx+1,0,{id:`blank_${us}`,name:nN,handle:{getFile:async()=>df},objectUrl:URL.createObjectURL(df),tocName:null});
                }
                this.ui.renderItems(this.fileItems); this.sortManager.init();
            } catch(e){console.error(e); this.ui.showToast('白紙挿入に失敗しました。',true);} finally{this.setProcessingState(false);}
        }
        handleDelete() { const sE=Array.from(document.querySelectorAll('.thumb-item.selected')); if(sE.length===0)return; this.saveHistory(); const dIds=sE.map(e=>e.dataset.id); this.fileItems=this.fileItems.filter(i=>!dIds.includes(i.id)); this.ui.renderItems(this.fileItems); this.sortManager.init(); this.ui.setButtonsState(false,this.fileItems.length>0); }
        async handleExternalDropToItem(iof, tId, isB) {
            if(this.isProcessing)return; const rF=iof instanceof FileList?Array.from(iof):Array.from(iof).map(i=>i.getAsFile&&i.getAsFile()||i);
            const sF=rF.find(f=>f&&f.name&&f.name.toLowerCase().endsWith('.json')); if(sF)return await this.processLoadSettings(sF);
            const tF=rF.find(f=>f&&f.name&&f.name.toLowerCase().endsWith('.txt')); if(tF)return await this.applyOrderFromText(await tF.text());
            this.setProcessingState(true);
            try {
                const nI=[];
                if(this.hasFSApi&&iof.length>0&&typeof iof[0].getAsFileSystemHandle==='function') {
                    const hP=[]; for(let i=0; i<iof.length; i++){if(iof[i].kind==='file')hP.push(iof[i].getAsFileSystemHandle());}
                    const hs=await Promise.all(hP); for(const h of hs){if(h&&h.kind==='file'&&!h.name.startsWith('.')){if(USER_SETTINGS.validExts.includes(h.name.split('.').pop().toLowerCase()))nI.push({handle:h,name:h.name});}}
                } else { for(let f of rF){if(!f||!f.name||f.name.startsWith('.'))continue; if(USER_SETTINGS.validExts.includes(f.name.split('.').pop().toLowerCase()))nI.push({handle:{getFile:async()=>f},name:f.name});} }
                if(nI.length>0) {
                    if(this.fileItems.length>0)this.saveHistory(); const aIs=nI.map(ni=>({id:`add_${Date.now()}_${Math.random().toString(36).substring(2,9)}`,name:ni.name,handle:ni.handle,objectUrl:null,tocName:null}));
                    let iIdx=this.fileItems.length; if(tId){let tIdx=this.fileItems.findIndex(i=>i.id===tId); if(tIdx!==-1)iIdx=isB?tIdx:tIdx+1;}
                    this.fileItems.splice(iIdx,0,...aIs); this.ui.renderItems(this.fileItems); this.sortManager.init();
                }
            } catch(e){console.error(e); this.ui.showToast('追加に失敗しました。',true);} finally{this.setProcessingState(false);}
        }
        async handleAddFilesToTail(foh, isH) {
            this.setProcessingState(true);
            try {
                if(this.fileItems.length>0)this.saveHistory(); const nI=[];
                for(let i=0; i<foh.length; i++){ const f=foh[i], n=f.name, e=n.split('.').pop().toLowerCase(); if(USER_SETTINGS.validExts.includes(e)) nI.push({id:`add_${Date.now()}_${Math.random().toString(36).substring(2,9)}`,name:n,handle:isH?f:{getFile:async()=>f},objectUrl:null,tocName:null}); }
                nI.sort((a,b)=>a.name.localeCompare(b.name,undefined,{numeric:true})); if(nI.length>0){this.fileItems.push(...nI); this.ui.renderItems(this.fileItems); this.sortManager.init();}
            } catch(e){console.error(e); this.ui.showToast('追加に失敗しました。',true);} finally{this.setProcessingState(false);}
        }
        getGridLayoutData() {
            const gR=this.ui.mainGrid.getBoundingClientRect(), is=[], vM=this.ui.viewModeSelect.value; let mx=0, my=0;
            this.ui.mainGrid.querySelectorAll('.thumb-item').forEach((el, idx) => {
                const fI=this.fileItems.find(i=>i.id===el.dataset.id); if(!fI)return; const img=el.querySelector('img'); if(!img)return; const r=img.getBoundingClientRect();
                const x=r.left-gR.left+this.ui.mainGrid.scrollLeft, y=r.top-gR.top+this.ui.mainGrid.scrollTop; let aX='center';
                if(vM==='spread-ltr'&&idx>0) aX=(idx%2===1)?'right':'left'; else if(vM==='spread-rtl'&&idx>0) aX=(idx%2===1)?'left':'right';
                is.push({fileItem:fI,x,y,w:r.width,h:r.height,alignX:aX,index:idx}); if(x+r.width>mx)mx=x+r.width; if(y+r.height+20>my)my=y+r.height+20;
            });
            return { items:is, totalWidth:mx+20, totalHeight:my+20 };
        }
        getSpreadPairs() {
            const vM=this.ui.viewModeSelect.value, ps=[]; if(vM==='grid'){this.fileItems.forEach(i=>ps.push([i])); return ps;}
            if(this.fileItems.length>0)ps.push([this.fileItems[0]]);
            for(let i=1; i<this.fileItems.length; i+=2){ const i1=this.fileItems[i], i2=this.fileItems[i+1]; if(!i2)ps.push([i1]); else ps.push(vM==='spread-rtl'?[i2,i1]:[i1,i2]); } return ps;
        }
        handleExportSettings() { this.saveSettings(this.ui.outputFilename.value.trim()||this.sourceFolderName); }
        handleExportOrder(silent=false) {
            if(this.fileItems.length===0)return; const bN=this.ui.outputFilename.value.trim()||this.sourceFolderName;
            const oT=this.fileItems.map(i=>i.tocName?`${i.name}\t${i.tocName}`:i.name).join('\n');
            const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([oT],{type:'text/plain'})); a.download=bN?`${bN}_order.txt`:'image_order.txt'; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),1000);
            try { const dS=new Date().toLocaleString(), t=bN||'無題のリスト', ts=Date.now(); let cs=JSON.parse(localStorage.getItem('image_sorting_orders')||'[]'); const eI=cs.findIndex(c=>c.title===t); if(eI!==-1){cs[eI].date=dS;cs[eI].orderText=oT;cs[eI].timestamp=ts;} else {cs.push({id:ts.toString(),title:t,date:dS,orderText:oT,timestamp:ts}); if(cs.length>50)cs.shift();} localStorage.setItem('image_sorting_orders',JSON.stringify(cs)); }catch(e){}
            if(!silent)this.ui.showToast(`並び順テキストとキャッシュを保存しました。`);
        }
        handleAutoSort(t, kF=true) {
            if(!t||this.fileItems.length===0)return; const rQs=t.split(/\s+/).map(q=>q.trim()).filter(q=>q); if(rQs.length===0)return;
            const qs=[...new Set(rQs)], gs={}, un=[]; qs.forEach(q=>gs[q]=[]);
            let iTs=this.fileItems, fI=null; if(kF&&this.fileItems.length>0){fI=this.fileItems[0]; iTs=this.fileItems.slice(1);}
            iTs.forEach(i=>{ let md=false; for(const q of qs){if(i.name.includes(q)){gs[q].push(i); md=true; break;}} if(!md)un.push(i); });
            const nIs=[]; if(fI)nIs.push(fI); qs.forEach(q=>nIs.push(...gs[q])); nIs.push(...un);
            this.saveHistory(); this.fileItems=nIs; this.ui.renderItems(this.fileItems); this.sortManager.init(); this.ui.showToast('自動並び替えを完了しました。');
        }
        async handleExecute() {
            if(this.fileItems.length===0)return; const sF=this.ui.saveFormatSelect.value, pf=(this.ui.outputFilename.value.trim()).replace(/[\\/:*?"<>|]/g,'_'), bN=pf||(this.sourceFolderName?this.sourceFolderName.replace(/[\\/:*?"<>|]/g,'_'):'');
            const rM=this.ui.resizeModeSelect.value, rB=this.ui.resizeBaseSelect.value; let rOs={mode:rM,baseType:rB,baseW:0,baseH:0};
            if(rM!=='none'){ this.setProcessingState(true); this.ui.updateProgress(0,'サイズ計算中...'); try{ const ds=await this.fs.calculateBaseDimensions(this.fileItems,rB,(c,t)=>{this.ui.updateProgress((c/t)*100,`サイズ計算中... ${c}/${t}`);}); rOs.baseW=ds.baseW; rOs.baseH=ds.baseH; }catch(e){this.ui.showToast('サイズ計算エラー',true); this.setProcessingState(false); return;} }
            if(sF==='epub'){
                let m; try{m=await this.epubModal.show(pf);}catch(e){return;} this.setProcessingState(true);
                try {
                    const r=await this.epubGen.generate(this.fileItems,m,this.ui.viewModeSelect.value,(c,t,i)=>{this.ui.updateProgress((c/t)*100,`EPUB生成中... ${c}/${t} (${i})`);},bN,rOs);
                    if(r&&r.success){this.ui.showToast('EPUBを保存しました。'); if(m.exportSettings)this.saveSettings(r.filename.replace(/\.epub$/i,''));}
                } catch(e){if(e.name!=='AbortError')this.ui.showToast('エラー: '+e.message,true);} finally{this.setProcessingState(false); setTimeout(()=>this.ui.updateProgress(0,''),3000);} return;
            }
            this.setProcessingState(true);
            try {
                if(sF==='rename'||sF==='copy'){
                    const uO=(sF==='copy');
                    if(this.hasFSApi){ let dh; try{dh=await window.showDirectoryPicker({mode:'readwrite',startIn:'downloads'});}catch(e){if(e.name==='AbortError')return;throw e;} await this.fs.saveRenamedFiles(dh,this.fileItems,(c,t,n)=>{this.ui.updateProgress((c/t)*100,`保存中... ${c}/${t} (${n})`);},pf,rOs,uO); this.ui.showToast('画像を保存しました。'); }
                    else { await this.fs.saveRenamedFilesFallback(this.fileItems,(c,t,n)=>{this.ui.updateProgress((c/t)*100,`保存中... ${c}/${t} (${n})`);},bN,pf,rOs,uO); this.ui.showToast('ZIPダウンロード完了'); }
                } else if(sF==='merge-rename'){
                    const ps=this.getSpreadPairs();
                    if(this.hasFSApi){ let dh; try{dh=await window.showDirectoryPicker({mode:'readwrite',startIn:'downloads'});}catch(e){if(e.name==='AbortError')return;throw e;} await this.fs.saveMergedRenamedFiles(dh,ps,(c,t,n)=>{this.ui.updateProgress((c/t)*100,`保存中... ${c}/${t} (${n})`);},pf,rOs); this.ui.showToast('結合画像を保存しました。'); }
                    else { await this.fs.saveMergedRenamedFilesFallback(ps,(c,t,n)=>{this.ui.updateProgress((c/t)*100,`保存中... ${c}/${t} (${n})`);},bN,pf,rOs); this.ui.showToast('ZIPダウンロード完了'); }
                } else if(sF.includes('pdf')){
                    const q=Math.max(1,Math.min(100,parseInt(this.ui.pdfQuality.value,10)||30)), vM=this.ui.viewModeSelect.value; let s1=false, s2=false; const uP=(sF!=='pdf-both');
                    if(sF==='pdf'||sF==='pdf-both') s1=await this.fs.saveAsPDF(this.fileItems,q,(c,t,i)=>{this.ui.updateProgress((c/t)*100,`PDF生成中... ${c}/${t} (${i})`);},bN,rOs,vM,uP);
                    if(sF==='pdf-sheet'||sF==='pdf-both') s2=await this.fs.saveAsThumbnailPDF(this.getGridLayoutData(),100,(c,t,i)=>{this.ui.updateProgress((c/t)*100,`PDF生成中... ${c}/${t} (${i})`);},bN?`${bN}_thumbnail`:'thumbnail_sheet',uP);
                    if(sF==='merge-pdf') s1=await this.fs.saveMergedAsPDF(this.getSpreadPairs(),q,(c,t,i)=>{this.ui.updateProgress((c/t)*100,`PDF生成中... ${c}/${t} (${i})`);},bN,rOs,vM,uP);
                    if(s1||s2){ if(sF==='pdf-both'){this.handleExportOrder(true); this.ui.showToast('一括出力完了');} else this.ui.showToast('PDF保存完了'); }
                }
            } catch(e){if(e.name!=='AbortError')this.ui.showToast('エラー: '+e.message,true);} finally{this.setProcessingState(false); setTimeout(()=>this.ui.updateProgress(0,''),3000);}
        }
        resetMemory() { new Set([...this.fileItems,...this.historyUndo.flat(),...this.historyRedo.flat()]).forEach(i=>{if(i.objectUrl){URL.revokeObjectURL(i.objectUrl); i.objectUrl=null;}}); }
        reset() { if(this.isProcessing)return; if(this.fileItems.length>0&&!confirm(USER_SETTINGS.msgConfirmReset))return; this.resetMemory(); this.fileItems=[]; this.historyUndo=[]; this.historyRedo=[]; this.sourceFolderName=null; this.ui.outputFilename.value=''; this.ui.clear(); this.updateHistoryButtons(); this.sortManager.destroy(); }
        openRestoreModal() { this.renderCacheList(); this.ui.restoreModal.style.display='flex'; }
        renderCacheList() {
            let cs=[]; try{cs=JSON.parse(localStorage.getItem('image_sorting_orders')||'[]');}catch(e){} const sM=this.ui.restoreSortMode?this.ui.restoreSortMode.value:'name';
            cs.sort((a,b)=>{if(sM==='name')return a.title.localeCompare(b.title,undefined,{numeric:true}); else{const ta=a.timestamp||parseInt(a.id,10)||0, tb=b.timestamp||parseInt(b.id,10)||0; return sM==='date-asc'?(ta-tb):(tb-ta);}});
            this.ui.restoreList.innerHTML=''; this.ui.restoreCheckAll.checked=false; this.updateCacheDeleteButton();
            if(cs.length===0){this.ui.restoreList.innerHTML='<div style="padding:20px; text-align:center; color:var(--text-sub); font-size:13px;">保存された並び順はありません。</div>'; return;}
            cs.forEach(c=>{
                const d=document.createElement('div'); d.style.cssText='display:flex;align-items:center;justify-content:space-between;padding:8px 12px;border-bottom:1px solid var(--border-color);gap:10px;width:100%;box-sizing:border-box;cursor:pointer;transition:0.1s;';
                d.addEventListener('mouseenter',()=>d.style.backgroundColor='rgba(128,128,128,0.1)'); d.addEventListener('mouseleave',()=>d.style.backgroundColor='transparent');
                const ck=document.createElement('input'); ck.type='checkbox'; ck.className='cache-check'; ck.dataset.id=c.id; ck.style.cssText='margin:0;cursor:pointer;flex-shrink:0;width:16px;height:16px;'; ck.addEventListener('change',()=>this.updateCacheDeleteButton());
                const inf=document.createElement('div'); inf.style.cssText='display:flex;flex-direction:column;flex-grow:1;min-width:0;overflow:hidden;';
                const ts=document.createElement('span'); ts.style.cssText='font-size:13px;font-weight:bold;color:var(--text-main);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:block;'; ts.textContent=c.title;
                const ds=document.createElement('span'); ds.style.cssText='font-size:11px;color:var(--text-sub);display:block;'; ds.textContent=c.date;
                inf.appendChild(ts); inf.appendChild(ds);
                const br=document.createElement('button'); br.textContent="復元"; br.style.cssText='padding:6px 12px;background:var(--primary-color);color:#fff;border:none;border-radius:4px;font-size:12px;font-weight:bold;cursor:pointer;flex-shrink:0;white-space:nowrap;';
                br.addEventListener('click',()=>{this.applyOrderFromText(c.orderText); this.ui.restoreModal.style.display='none';}); d.addEventListener('click',(e)=>{if(e.target.closest('button')||e.target.tagName.toLowerCase()==='input')return; ck.checked=!ck.checked; this.updateCacheDeleteButton();});
                d.appendChild(ck); d.appendChild(inf); d.appendChild(br); this.ui.restoreList.appendChild(d);
            });
        }
        updateCacheDeleteButton() { const c=this.ui.restoreList.querySelectorAll('.cache-check:checked'); this.ui.btnDeleteSelectedCache.disabled=c.length===0; const a=this.ui.restoreList.querySelectorAll('.cache-check'); this.ui.restoreCheckAll.checked=(a.length>0&&c.length===a.length); }
        deleteSelectedCaches() { if(!confirm('クリアしますか？'))return; const is=Array.from(this.ui.restoreList.querySelectorAll('.cache-check:checked')).map(c=>c.dataset.id); try{ let cs=JSON.parse(localStorage.getItem('image_sorting_orders')||'[]'); cs=cs.filter(c=>!is.includes(c.id)); localStorage.setItem('image_sorting_orders',JSON.stringify(cs)); this.renderCacheList(); this.ui.showToast('クリアしました。'); }catch(e){} }
    }
    new App();
});