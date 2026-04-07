// ========== 论坛热点统计==========

(function () {
    'use strict';

    /** 与 hotspot_stats.html .shell 一致：min(90vh, 800px) */
    const HB_STATS_PANEL_H = 'min(90vh, 800px)';
    /** 历史热词 / 时间分布 / 用户统计 外层弹窗：比主卡片矮 79px */
    const HB_SUB_PANEL_H = 'calc(min(90vh, 800px) - 79px)';
    const HB_SUB_PANEL_H_MOBILE = 'min(calc(100vh - 95px), 721px)';
    /** 仅左上角该区域可拖动主窗口 / 子弹窗 */
    const DRAG_CORNER_PX = 30;
    /** 移动端判定 */
    const isMobile = () => window.innerWidth <= 767;

    /** 移动端顶部安全区（刘海屏等） */
    const SAFE_TOP = () => isMobile() ? 44 : 0;
    /** 移动端底部安全区（Home Indicator） */
    const SAFE_BOTTOM = () => isMobile() ? 34 : 0;

    const HB_SUB_DIALOG_CSS = `
.hb-sub-dialog, .hb-sub-dialog * { box-sizing: border-box; }
.hb-sub-dialog {
  --green: #27ae60;
  --teal: #26a69a;
  --muted: #666;
  --border: #e8e8e8;
  --track: #ececec;
}
.hb-sub-dialog .hb-sub-body-scope {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'PingFang SC', 'Microsoft YaHei', sans-serif;
  font-size: 13px;
  color: #1f2328;
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
}
.hb-sub-dialog .hb-stats-loading {
  flex: 1 1 auto;
  min-height: 160px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 32px 20px;
  box-sizing: border-box;
}
.hb-sub-dialog .hb-stats-loading__main {
  font-size: 15px;
  font-weight: 600;
  color: #555;
  margin-bottom: 10px;
  line-height: 1.4;
}
.hb-sub-dialog .hb-stats-loading__hint {
  font-size: 12px;
  color: #888;
  line-height: 1.6;
  max-width: 280px;
}
.hb-sub-dialog .pills { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px; flex-shrink: 0; }
.hb-sub-dialog .pills button {
  padding: 5px 11px; border-radius: 6px; border: 1px solid #ccc;
  background: #f8f9fa; color: #333; font-size: 12px; cursor: pointer; min-height: 30px;
}
.hb-sub-dialog .pills-teal button:not(.on) { background: #fff; border-color: #dee2e6; color: #212529; }
.hb-sub-dialog .pills-teal button.on { background: #17a2b8; color: #fff; border-color: #17a2b8; }
.hb-sub-dialog .pills-green button:not(.on) { background: #fff; border-color: #dee2e6; color: #212529; }
.hb-sub-dialog .pills-green button.on { background: var(--green); color: #fff; border-color: var(--green); }
.hb-sub-dialog .meta-block {
  background: #f8f9fa; border-radius: 8px; padding: 10px 12px; font-size: 12px;
  color: var(--muted); line-height: 1.7; margin-bottom: 12px; border: 1px solid #dee2e6;
  flex-shrink: 0;
}
.hb-sub-dialog #time-dynamic > .meta-block { margin-bottom: 14px; }
.hb-sub-dialog .empty {
  text-align: center; color: #888; padding: 24px 12px; background: #fafafa;
  border: 1px dashed #ddd; border-radius: 8px; font-size: 13px;
}
.hb-sub-dialog .time-modal-stack {
  display: flex; flex-direction: column; flex: 1 1 auto; min-height: 0; overflow: hidden;
}
.hb-sub-dialog .time-modal-stack > .pills { flex-shrink: 0; }
.hb-sub-dialog #time-dynamic {
  flex: 1 1 auto; min-height: 0; overflow-x: hidden; overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}
.hb-sub-dialog .time-modal-stack--nodata { justify-content: center; min-height: 140px; }
.hb-sub-dialog .chart-block {
  border: 1px solid #dee2e6; border-radius: 8px; padding: 14px 12px; background: #fff;
}
.hb-sub-dialog .chart-block + .chart-block { margin-top: 12px; }
.hb-sub-dialog .chart-title {
  color: #17a2b8; font-weight: 700; font-size: 14px; margin-bottom: 12px;
}
.hb-sub-dialog .hour-row {
  display: flex; align-items: center; gap: 10px; margin-bottom: 0; padding: 2.5px 0;
  min-height: 34px; font-size: 12px; border-bottom: 1px solid #f0f0f0;
}
.hb-sub-dialog .hour-row:last-child { border-bottom: none; }
.hb-sub-dialog .hour-row .hl { flex: 0 0 36px; color: #555; font-variant-numeric: tabular-nums; }
.hb-sub-dialog .hour-row .bar-track {
  flex: 1; height: 14px; border-radius: 7px; background: #ececec; overflow: hidden;
}
.hb-sub-dialog .hour-row .bar-fill {
  height: 100%; border-radius: 7px; background: #17a2b8; min-width: 0;
}
.hb-sub-dialog .hour-row .hc { flex: 0 0 36px; text-align: right; color: #666; font-variant-numeric: tabular-nums; }
.hb-sub-dialog .week-row {
  display: flex; align-items: center; gap: 10px; margin-bottom: 0; padding: 2.5px 0;
  min-height: 34px; font-size: 12px; border-bottom: 1px solid #f0f0f0;
}
.hb-sub-dialog .week-row:last-child { border-bottom: none; }
.hb-sub-dialog .week-row .wl { flex: 0 0 52px; color: #555; }
.hb-sub-dialog .week-row .bar-track {
  flex: 1; height: 14px; border-radius: 7px; background: #ececec; overflow: hidden;
}
.hb-sub-dialog .week-row .bar-fill {
  height: 100%; border-radius: 7px; background: #28a745; min-width: 0;
}
.hb-sub-dialog .week-row .wc { flex: 0 0 36px; text-align: right; color: #666; font-variant-numeric: tabular-nums; }
/* .list-inner 与主卡片 #main-list > .list 一致 */
.hb-sub-dialog .list-inner {
  border: 1px solid var(--border); border-radius: 8px; overflow-y: auto; background: #fff;
  flex: 1 1 auto; min-height: 0;
}
/* 排行行与主卡片 .rank-row 同：gap / padding / 分隔线 / min-height / 列宽 */
.hb-sub-dialog .row-hist, .hb-sub-dialog .row-user {
  display: flex; align-items: center; gap: 10px; padding: 2.5px 12px;
  border-bottom: 1px solid #f0f0f0; background: #fff; min-height: 34px;
}
.hb-sub-dialog .row-hist:last-child, .hb-sub-dialog .row-user:last-child { border-bottom: none; }
.hb-sub-dialog .row-hist.top3, .hb-sub-dialog .row-user.top3 { background: #f0f9eb; }
.hb-sub-dialog .row-hist .rank-label, .hb-sub-dialog .row-user .rank-label {
  flex: 0 0 36px; text-align: center; font-size: 15px; line-height: 1;
  font-weight: 600; color: #606266; font-variant-numeric: tabular-nums;
}
.hb-sub-dialog .row-hist.top3 .rank-label, .hb-sub-dialog .row-user.top3 .rank-label {
  font-size: 15px; font-weight: normal; color: inherit;
}
.hb-sub-dialog .row-hist .w, .hb-sub-dialog .row-user .w {
  flex: 1 1 auto; min-width: 0; font-weight: 700; word-break: break-all; font-size: 13px;
}
.hb-sub-dialog .row-hist.top3 .w, .hb-sub-dialog .row-user.top3 .w { color: var(--green); }
.hb-sub-dialog .row-hist:not(.top3) .w, .hb-sub-dialog .row-user:not(.top3) .w { color: #303133; }
.hb-sub-dialog .row-hist .bar-track, .hb-sub-dialog .row-user .bar-track {
  flex: 0 0 100px; width: 100px; min-width: 100px; max-width: 100px;
  height: 10px; background: var(--track); border-radius: 999px; overflow: hidden;
}
.hb-sub-dialog .row-hist .bar-fill, .hb-sub-dialog .row-user .bar-fill {
  height: 100%; min-width: 2px; border-radius: 999px; transition: width 0.2s ease;
}
.hb-sub-dialog .row-hist.top3 .bar-fill, .hb-sub-dialog .row-user.top3 .bar-fill { background: #67c23a; }
.hb-sub-dialog .row-hist:not(.top3) .bar-fill, .hb-sub-dialog .row-user:not(.top3) .bar-fill { background: var(--teal); }
.hb-sub-dialog .row-hist .cnt, .hb-sub-dialog .row-user .cnt {
  flex: 0 0 36px; text-align: right; font-size: 12px; color: #666; font-variant-numeric: tabular-nums;
}
/* 子弹窗标题区：与主卡片 .shell 内边距 + .page-head 观感一致（同 iframe .modal-h：14px 16px） */
.hb-sub-dialog .hb-sub-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid var(--border);
  background: #fff;
  border-radius: 10px 10px 0 0;
  flex-shrink: 0;
  position: relative;
}
.hb-sub-dialog .hb-sub-title {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  letter-spacing: 0.02em;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'PingFang SC', 'Microsoft YaHei', sans-serif;
}
.hb-sub-dialog.hb-sub--history .hb-sub-title { color: #6f42c1; }
.hb-sub-dialog.hb-sub--time .hb-sub-title { color: #17a2b8; }
.hb-sub-dialog.hb-sub--users .hb-sub-title { color: #28a745; }
`;

    function appendHtmlFragment(container, html) {
        if (!html) return;
        const t = document.createElement('div');
        t.innerHTML = html;
        while (t.firstChild) container.appendChild(t.firstChild);
    }

    const NodeSeekFocus = {
        hbServiceBase: 'https://hb.396663.xyz',
        _statsIframe: null,
        /** @type {Map<string, object>} modal -> { wrap, dia, bodyEl, pillsClick, dragFns } */
        _subPanels: null,
        _subZ: 10001,
        _statsMsgBound: false,

        showHotTopicsDialog() {
            const existing = document.getElementById('hot-topics-dialog');
            if (existing) {
                const keepSubs = this._subPanels && this._subPanels.size > 0;
                if (keepSubs) this._parkStatsIframeBridge(existing);
                else this._closeAllSubDialogs();
                existing.remove();
                if (!keepSubs) this._statsIframe = null;
                return;
            }
            this._createStatsDialog();
        },

        /** 主卡片关闭但仍有子弹窗时：保留 iframe 到屏外，供 pills 继续 postMessage 重算数据 */
        _parkStatsIframeBridge(dialog) {
            const iframe = this._statsIframe || (dialog && dialog.querySelector('iframe'));
            if (!iframe) return;
            Object.assign(iframe.style, {
                position: 'fixed', left: '-9999px', top: '0', width: '520px', height: '800px',
                opacity: '0', pointerEvents: 'none', border: '0', zIndex: '-1', display: 'block',
                borderRadius: '0', minHeight: '0', background: 'transparent',
            });
            document.body.appendChild(iframe);
            this._statsIframe = iframe;
        },

        _maybeCleanupOrphanBridgeIframe() {
            if (document.getElementById('hot-topics-dialog')) return;
            if (this._subPanels && this._subPanels.size > 0) return;
            const iframe = this._statsIframe;
            if (iframe && iframe.parentNode) iframe.remove();
            this._statsIframe = null;
        },

        _createStatsDialog() {
            const self = this;
            const dialog = document.createElement('div');
            dialog.id = 'hot-topics-dialog';
            Object.assign(dialog.style, {
                position: 'fixed', top: '60px', right: '16px', zIndex: '10000',
                width: '520px', height: HB_STATS_PANEL_H, maxHeight: HB_STATS_PANEL_H,
                margin: '0', padding: '0', background: 'transparent',
                border: 'none', boxShadow: 'none', overflow: 'visible',
            });
            if (isMobile()) {
                Object.assign(dialog.style, {
                    position: 'fixed', top: '0', bottom: '0', left: '0', right: '0',
                    width: '100%', height: 'auto',
                    maxHeight: 'calc(100vh - ' + SAFE_TOP() + 'px - ' + SAFE_BOTTOM() + 'px)',
                    zIndex: '10000',
                });
            } else {
                Object.assign(dialog.style, {
                    position: 'fixed', top: '60px', right: '16px', zIndex: '10000',
                    width: '520px', height: HB_STATS_PANEL_H, maxHeight: HB_STATS_PANEL_H,
                    margin: '0', padding: '0', background: 'transparent',
                    border: 'none', boxShadow: 'none', overflow: 'visible',
                });
            }

            const dragArea = document.createElement('div');
            dragArea.title = '左上角区域拖动窗口';
            Object.assign(dragArea.style, {
                position: 'absolute', left: '0', top: '0',
                width: DRAG_CORNER_PX + 'px', height: DRAG_CORNER_PX + 'px',
                cursor: 'move', zIndex: '2', background: 'transparent',
            });

            const closeBtn = document.createElement('button');
            closeBtn.id = 'hot-topics-dialog-close';
            closeBtn.type = 'button';
            closeBtn.textContent = '\u00D7';
            closeBtn.title = '关闭';
            if (isMobile()) {
                Object.assign(closeBtn.style, {
                    position: 'absolute', top: '12px', right: '12px', zIndex: '4',
                    cursor: 'pointer', fontSize: '28px', lineHeight: '1', color: '#fff',
                    border: 'none', background: 'rgba(0,0,0,0.35)', borderRadius: '50%',
                    padding: '8px', minWidth: '44px', minHeight: '44px',
                    fontFamily: 'inherit', boxShadow: 'none',
                });
            } else {
                Object.assign(closeBtn.style, {
                    position: 'absolute', top: '6px', right: '6px', zIndex: '4',
                    cursor: 'pointer', fontSize: '22px', lineHeight: '1', color: '#999',
                    border: 'none', background: 'rgba(255,255,255,0.92)', borderRadius: '8px',
                    padding: '2px 10px', minHeight: 'auto', fontFamily: 'inherit',
                    boxShadow: '0 1px 4px rgba(0,0,0,.08)',
                });
            }
            closeBtn.onclick = () => {
                const keepSubs = this._subPanels && this._subPanels.size > 0;
                if (keepSubs) this._parkStatsIframeBridge(dialog);
                else this._closeAllSubDialogs();
                dialog.remove();
                if (!keepSubs) this._statsIframe = null;
            };

            let iframe = this._statsIframe;
            const canReuseBridge = iframe && iframe.parentNode && document.body.contains(iframe) &&
                !document.getElementById('hot-topics-dialog') &&
                String(iframe.src || '').indexOf('hotspot_stats') !== -1;

            if (canReuseBridge) {
                iframe.removeAttribute('style');
                Object.assign(iframe.style, {
                    width: '100%', height: '100%', minHeight: '0',
                    border: '0', borderRadius: '12px', display: 'block', background: 'transparent',
                });
                dialog.appendChild(iframe);
                dialog.appendChild(dragArea);
                dialog.appendChild(closeBtn);
                document.body.appendChild(dialog);
                self._initDraggable(dialog, dragArea, closeBtn);
                self._bindStatsMessageOnce();
                return;
            }

            iframe = document.createElement('iframe');
            iframe.setAttribute('title', '热点统计');
            iframe.setAttribute('allow', 'clipboard-read; clipboard-write');
            if (isMobile()) {
                Object.assign(iframe.style, {
                    width: '100%', height: '100%', minHeight: '0',
                    border: '0', borderRadius: '0', display: 'block', background: '#fff',
                    overflow: 'auto', WebkitOverflowScrolling: 'touch',
                });
            } else {
                Object.assign(iframe.style, {
                    width: '100%', height: '100%', minHeight: '0',
                    border: '0', borderRadius: '12px', display: 'block', background: 'transparent',
                });
            }

            dialog.appendChild(iframe);
            dialog.appendChild(dragArea);
            dialog.appendChild(closeBtn);
            document.body.appendChild(dialog);
            self._statsIframe = iframe;
            self._initDraggable(dialog, dragArea, closeBtn);
            self._bindStatsMessageOnce();

            // 先设 src 再挂到 DOM：弹窗立刻可见，iframe 内 hotspot_stats 自行显示「数据加载中…」
            iframe.src = self.hbServiceBase + '/hotspot_stats.html?embed=1';
        },

        _bindStatsMessageOnce() {
            if (this._statsMsgBound) return;
            this._statsMsgBound = true;
            window.addEventListener('message', (ev) => {
                const d = ev.data;
                const iframe = this._statsIframe;
                if (!iframe || ev.source !== iframe.contentWindow) return;

                if (d && d.type === 'hb-hotspot-iframe-modal') {
                    const cb = document.getElementById('hot-topics-dialog-close');
                    if (!cb) return;
                    /* 仅 iframe 内真正打开全屏 modal 时暂隐主窗 ×；子弹窗在外层，主窗 × 应始终可关主卡片 */
                    if (d.open) {
                        cb.style.visibility = 'hidden';
                        cb.style.pointerEvents = 'none';
                    } else {
                        cb.style.visibility = '';
                        cb.style.pointerEvents = '';
                    }
                    return;
                }

                if (d && d.type === 'hb-stats-body-update') {
                    const modalKey = d.modal === 'history' || d.modal === 'time' || d.modal === 'users' ? d.modal : '';
                    const dia = modalKey ? document.querySelector('.hb-sub-dialog[data-hb-modal="' + modalKey + '"]') : null;
                    if (!dia) return;
                    const titleEl = dia.querySelector('.hb-sub-title');
                    if (d.title && titleEl) titleEl.textContent = d.title;
                    const scope = dia.querySelector('.hb-sub-body-scope');
                    if (!scope) return;
                    scope.innerHTML = '';
                    appendHtmlFragment(scope, d.pills || '');
                    appendHtmlFragment(scope, d.body || '');
                    return;
                }

                if (!d || d.type !== 'hb-stats-open') return;

                const mkey = d.modal === 'history' || d.modal === 'time' || d.modal === 'users' ? d.modal : 'time';
                if (!this._subPanels) this._subPanels = new Map();
                if (this._subPanels.has(mkey)) {
                    this._closeOneSubDialog(mkey);
                    return;
                }

                this._openSubDialog(mkey, d.title, d.body, d.pills);
            });
        },

        _ensureSubDialogGlobalCss() {
            if (document.getElementById('hb-sub-dialog-global-css')) return;
            const s = document.createElement('style');
            s.id = 'hb-sub-dialog-global-css';
            s.textContent = HB_SUB_DIALOG_CSS;
            document.head.appendChild(s);
        },

        _openSubDialog(modal, title, body, pills) {
            if (!this._subPanels) this._subPanels = new Map();
            this._ensureSubDialogGlobalCss();

            const mobile = isMobile();
            const wrap = document.createElement('div');
            wrap.className = 'hb-sub-overlay';
            wrap.id = 'hb-sub-overlay-' + modal;
            this._subZ += 1;
            // 移动端无额外 padding，弹窗直接贴边；桌面端保留 16px 边距
            wrap.style.cssText = mobile
                ? 'position:fixed;inset:0;z-index:' + this._subZ + ';background:rgba(0,0,0,.35);pointer-events:auto;display:flex;align-items:flex-end;justify-content:center;'
                : 'position:fixed;inset:0;z-index:' + this._subZ + ';background:transparent;pointer-events:none;display:flex;align-items:center;justify-content:center;padding:16px;';

            const dia = document.createElement('div');
            dia.className = 'hb-sub-dialog';
            dia.setAttribute('data-hb-modal', modal);
            dia.style.pointerEvents = 'auto';
            const subKind = mobile ? modal : (modal === 'history' || modal === 'time' || modal === 'users' ? modal : 'time');
            dia.classList.add('hb-sub--' + subKind);

            const dragCorner = document.createElement('div');
            dragCorner.title = mobile ? '拖动关闭' : '左上角区域拖动窗口';
            // 移动端热区撑满整行标题栏，方便滑动关闭
            const dragW = mobile ? '100%' : DRAG_CORNER_PX + 'px';
            const dragH = mobile ? '44px' : DRAG_CORNER_PX + 'px';
            Object.assign(dragCorner.style, {
                position: 'absolute', left: '0', top: '0',
                width: dragW, height: dragH,
                cursor: 'move', zIndex: '11', background: 'transparent',
            });

            const head = document.createElement('div');
            head.className = 'hb-sub-head';

            const titleEl = document.createElement('span');
            titleEl.className = 'hb-sub-title';
            titleEl.textContent = title || '';

            const xBtn = document.createElement('button');
            xBtn.type = 'button';
            xBtn.textContent = '\u00D7';
            if (mobile) {
                Object.assign(xBtn.style, {
                    background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer',
                    color: '#666', padding: '8px 12px', lineHeight: '1', fontFamily: 'inherit',
                    flexShrink: '0', position: 'relative', zIndex: '12', minWidth: '44px', minHeight: '44px',
                });
            } else {
                Object.assign(xBtn.style, {
                    background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer',
                    color: '#999', padding: '2px 8px', lineHeight: '1', fontFamily: 'inherit',
                    flexShrink: '0', position: 'relative', zIndex: '12',
                });
            }
            const self = this;
            const modalKey = modal;
            xBtn.onclick = () => this._closeOneSubDialog(modalKey);

            head.appendChild(titleEl);
            head.appendChild(xBtn);

            const bodyEl = document.createElement('div');
            bodyEl.style.cssText = 'flex:1;min-height:0;overflow:hidden;padding:12px 16px 16px;display:flex;flex-direction:column;';

            const scope = document.createElement('div');
            scope.className = 'hb-sub-body-scope';
            appendHtmlFragment(scope, pills || '');
            appendHtmlFragment(scope, body || '');
            bodyEl.appendChild(scope);

            const pillsClick = function (e) {
                const btn = e.target.closest('.pills button');
                if (!btn || !dia.contains(btn) || !btn.dataset.iso) return;
                btn.classList.toggle('on');
                const sc = dia.querySelector('.hb-sub-body-scope');
                if (!sc) return;
                const selected = [];
                sc.querySelectorAll('.pills button').forEach(function (b) {
                    if (b.classList.contains('on') && b.dataset.iso) selected.push(b.dataset.iso);
                });
                if (self._statsIframe && self._statsIframe.contentWindow) {
                    self._statsIframe.contentWindow.postMessage({
                        type: 'hb-stats-pills-change',
                        modal: modalKey,
                        dates: selected,
                    }, '*');
                }
            };
            bodyEl.addEventListener('click', pillsClick);

            const subPanelH = mobile ? HB_SUB_PANEL_H_MOBILE : HB_SUB_PANEL_H;
            if (mobile) {
                // 移动端：弹窗从底部弹出，高度动态，圆角仅顶部
                Object.assign(dia.style, {
                    background: '#fff',
                    borderRadius: '16px 16px 0 0',
                    width: '100%', maxWidth: '100%',
                    height: subPanelH, maxHeight: subPanelH,
                    overflow: 'hidden', display: 'flex', flexDirection: 'column',
                    boxShadow: '0 -4px 24px rgba(0,0,0,.15)',
                    position: 'fixed',
                });
            } else {
                Object.assign(dia.style, {
                    background: '#fff', borderRadius: '10px', width: '520px', maxWidth: '100%',
                    height: subPanelH, maxHeight: subPanelH,
                    overflow: 'hidden', display: 'flex', flexDirection: 'column',
                    boxShadow: '0 16px 48px rgba(0,0,0,.2)', border: '1px solid #e0e0e0',
                    position: 'fixed',
                });
            }

            wrap.appendChild(dia);
            dia.appendChild(dragCorner);
            dia.appendChild(head);
            dia.appendChild(bodyEl);
            document.body.appendChild(wrap);

            const entry = { wrap, dia, bodyEl, pillsClick, dragFns: null };
            this._subPanels.set(modal, entry);

            requestAnimationFrame(() => {
                if (mobile) {
                    // 移动端：从底部弹出，无需 left/top 定位，无需拖拽
                    this._initSubDialogDraggable(entry, dragCorner, xBtn);
                    return;
                }
                const w = dia.offsetWidth;
                const h = dia.offsetHeight;
                const vw = window.innerWidth;
                const vh = window.innerHeight;
                const stackOff = (this._subPanels.size - 1) * 28;
                dia.style.left = Math.round(Math.max(16, (vw - w) / 2) + stackOff) + 'px';
                dia.style.top = Math.round(Math.max(16, Math.min(60, (vh - h) / 2)) + stackOff) + 'px';

                this._initSubDialogDraggable(entry, dragCorner, xBtn);
            });
        },

        _initSubDialogDraggable(entry, dragHandle, closeBtn) {
            const dia = entry.dia;
            let dragging = false;
            let startX = 0;
            let startY = 0;
            let initL = 0;
            let initT = 0;

            const onDown = (e) => {
                if (closeBtn.contains(e.target)) return;
                if (!dragHandle.contains(e.target)) return;
                e.preventDefault();
                dragging = true;
                startX = e.clientX;
                startY = e.clientY;
                const r = dia.getBoundingClientRect();
                initL = r.left;
                initT = r.top;
                dia.style.position = 'fixed';
                dia.style.left = initL + 'px';
                dia.style.top = initT + 'px';
                dia.style.margin = '0';
                document.body.style.userSelect = 'none';
            };
            const onMove = (e) => {
                if (!dragging) return;
                e.preventDefault();
                const vw = window.innerWidth;
                const vh = window.innerHeight;
                const dw = dia.offsetWidth;
                const dh = dia.offsetHeight;
                const left = Math.max(0, Math.min(vw - dw, initL + e.clientX - startX));
                const top = Math.max(0, Math.min(vh - dh, initT + e.clientY - startY));
                dia.style.left = left + 'px';
                dia.style.top = top + 'px';
            };
            const onUp = () => {
                dragging = false;
                document.body.style.userSelect = '';
            };

            const onTouchStart = (e) => {
                if (closeBtn.contains(e.target)) return;
                if (!dragHandle.contains(e.target)) return;
                const t = e.touches[0];
                dragging = true;
                startX = t.clientX;
                startY = t.clientY;
                const r = dia.getBoundingClientRect();
                initL = r.left;
                initT = r.top;
                dia.style.position = 'fixed';
                dia.style.left = initL + 'px';
                dia.style.top = initT + 'px';
            };
            const onTouchMove = (e) => {
                if (!dragging) return;
                e.preventDefault();
                const t = e.touches[0];
                const vw = window.innerWidth;
                const vh = window.innerHeight;
                const dw = dia.offsetWidth;
                const dh = dia.offsetHeight;
                const left = Math.max(0, Math.min(vw - dw, initL + t.clientX - startX));
                const top = Math.max(0, Math.min(vh - dh, initT + t.clientY - startY));
                dia.style.left = left + 'px';
                dia.style.top = top + 'px';
            };
            const onTouchEnd = () => { dragging = false; };

            dragHandle.addEventListener('mousedown', onDown);
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
            dragHandle.addEventListener('touchstart', onTouchStart, { passive: false });
            document.addEventListener('touchmove', onTouchMove, { passive: false });
            document.addEventListener('touchend', onTouchEnd);

            entry.dragFns = { dragHandle, onDown, onMove, onUp, onTouchStart, onTouchMove, onTouchEnd };
        },

        _teardownSubDialogDragForEntry(entry) {
            if (!entry || !entry.dragFns) return;
            const h = entry.dragFns.dragHandle;
            const f = entry.dragFns;
            h.removeEventListener('mousedown', f.onDown);
            document.removeEventListener('mousemove', f.onMove);
            document.removeEventListener('mouseup', f.onUp);
            h.removeEventListener('touchstart', f.onTouchStart);
            document.removeEventListener('touchmove', f.onTouchMove);
            document.removeEventListener('touchend', f.onTouchEnd);
            entry.dragFns = null;
        },

        _closeOneSubDialog(modal) {
            if (!this._subPanels) return;
            const entry = this._subPanels.get(modal);
            if (!entry) return;

            this._teardownSubDialogDragForEntry(entry);
            if (entry.bodyEl && entry.pillsClick) {
                entry.bodyEl.removeEventListener('click', entry.pillsClick);
            }
            if (entry.wrap && entry.wrap.parentNode) entry.wrap.remove();
            this._subPanels.delete(modal);

            if (this._subPanels.size === 0) {
                const iframe = this._statsIframe;
                if (iframe && iframe.contentWindow) {
                    iframe.contentWindow.postMessage({ type: 'hb-stats-modal-closed' }, '*');
                }
                this._subPanels = null;
                this._maybeCleanupOrphanBridgeIframe();
            }
        },

        _closeAllSubDialogs() {
            if (!this._subPanels) return;
            const keys = Array.from(this._subPanels.keys());
            keys.forEach((k) => this._closeOneSubDialog(k));
        },

        _initDraggable(dialog, dragArea, closeBtn) {
            let isDragging = false;
            let startX = 0;
            let startY = 0;
            let initialLeft = 0;
            let initialTop = 0;

            const onMouseDown = (e) => {
                if (closeBtn.contains(e.target) || !dragArea.contains(e.target)) return;
                e.preventDefault();
                isDragging = true;
                startX = e.clientX;
                startY = e.clientY;
                const rect = dialog.getBoundingClientRect();
                initialLeft = rect.left;
                initialTop = rect.top;
                document.body.style.userSelect = 'none';
            };
            const onMouseMove = (e) => {
                if (!isDragging) return;
                e.preventDefault();
                const vw = window.innerWidth;
                const vh = window.innerHeight;
                const dw = dialog.offsetWidth;
                const dh = dialog.offsetHeight;
                dialog.style.left = Math.max(0, Math.min(vw - dw, initialLeft + e.clientX - startX)) + 'px';
                dialog.style.top = Math.max(0, Math.min(vh - dh, initialTop + e.clientY - startY)) + 'px';
                dialog.style.right = 'auto';
            };
            const onMouseUp = () => {
                isDragging = false;
                document.body.style.userSelect = '';
            };

            const onTouchStart = (e) => {
                if (closeBtn.contains(e.target) || !dragArea.contains(e.target)) return;
                const t = e.touches[0];
                isDragging = true;
                startX = t.clientX;
                startY = t.clientY;
                const rect = dialog.getBoundingClientRect();
                initialLeft = rect.left;
                initialTop = rect.top;
            };
            const onTouchMove = (e) => {
                if (!isDragging) return;
                e.preventDefault();
                const t = e.touches[0];
                const vw = window.innerWidth;
                const vh = window.innerHeight;
                const dw = dialog.offsetWidth;
                const dh = dialog.offsetHeight;
                dialog.style.left = Math.max(0, Math.min(vw - dw, initialLeft + t.clientX - startX)) + 'px';
                dialog.style.top = Math.max(0, Math.min(vh - dh, initialTop + t.clientY - startY)) + 'px';
                dialog.style.right = 'auto';
            };
            const onTouchEnd = () => { isDragging = false; };

            document.addEventListener('mousedown', onMouseDown);
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
            document.addEventListener('touchstart', onTouchStart, { passive: false });
            document.addEventListener('touchmove', onTouchMove, { passive: false });
            document.addEventListener('touchend', onTouchEnd);
        },

        refreshHotTopicsDialog() {
            const d = document.getElementById('hot-topics-dialog');
            if (!d) return;
            const iframe = d.querySelector('iframe');
            if (iframe && iframe.src) iframe.src = iframe.src;
        }
    };

    window.NodeSeekFocus = NodeSeekFocus;
})();
