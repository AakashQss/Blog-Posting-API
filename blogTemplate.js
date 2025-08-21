function generateBlogTemplate(updatedHTML, toc = "", uploader = "System") {
  return `
    <style>
    @import url('https://fonts.googleapis.com/css2?family=Source+Sans+Pro:wght@400;600;700&display=swap');
    
    /* Scope everything so it does not affect site footer/header */
    .qss-blog-scope * { margin: 0; padding: 0; box-sizing: border-box; }
    .qss-blog-scope {
      font-family: 'Source Sans Pro', sans-serif;
      line-height: 1.6;
      color: #111;
      background: #fff;
      font-size: 18px;
      text-align: left;
    }

    .qss-blog-scope .o_blog_cover_container, 
    .qss-blog-scope .o_blog_post_cover, 
    .qss-blog-scope .blog_header_cover, 
    .qss-blog-scope .cover_header, 
    .qss-blog-scope .o_blog_post_complete_header, 
    .qss-blog-scope .blog_post_complete_header { display: none !important; }
    
    .qss-blog-scope br.ProseMirror-trailingBreak { display: none !important; }
    
    .qss-blog-scope .blog-container,
    .qss-blog-scope .blog-content,
    .qss-blog-scope h1,
    .qss-blog-scope h2,
    .qss-blog-scope h3,
    .qss-blog-scope h4,
    .qss-blog-scope p,
    .qss-blog-scope ul,
    .qss-blog-scope ol,
    .qss-blog-scope table,
    .qss-blog-scope blockquote {
      text-align: left;
    }
    
    .qss-blog-scope .blog-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 40px 20px 0 20px;
      background: #fff;
    }
    .qss-blog-scope .blog-content {
      max-width: 900px;
      margin: 0 auto;
    }
    
    .qss-blog-scope h1 { font-size: 36px; font-weight: 700; color: #111; margin-bottom: 1.5rem; line-height: 1.15; }
    .qss-blog-scope h2, .qss-blog-scope h3, .qss-blog-scope h4 { color: #111; font-weight: 600; }
    .qss-blog-scope h2 { font-size: 24px; margin: 2rem 0 1rem; border-bottom: 2px solid #ececec; padding-bottom: 0.5rem; position: relative; line-height: 1.2; }
    .qss-blog-scope h2::before { content: ''; position: absolute; bottom: -2px; left: 0; width: 60px; height: 2px; background: #ececec; }
    .qss-blog-scope h3 { font-size: 20px; margin: 1.75rem 0 1rem; }
    .qss-blog-scope h4 { font-size: 18px; margin: 1.5rem 0 1rem; font-weight: 600; }
    
    .qss-blog-scope p, .qss-blog-scope ul li, .qss-blog-scope ol li { font-size: 18px; color: #111; line-height: 1.7; margin-bottom: 1.5rem; }
    .qss-blog-scope ul, .qss-blog-scope ol { margin: 1.5rem 0; padding-left: 2rem; }
    .qss-blog-scope ul li, .qss-blog-scope ol li { margin-bottom: 0.75rem; }
    
    .qss-blog-scope table {
      width: 100%;
      border-collapse: collapse;
      margin: 2rem 0;
      background: #fff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 6px 28px -6px rgba(60,60,60,0.13);
    }
    .qss-blog-scope th, .qss-blog-scope td {
      padding: 1rem;
      text-align: left;
      border-bottom: 1px solid #e5e7eb;
      background: #fff;
      color: #111;
    }
    .qss-blog-scope th { font-weight: 600; color: #222; text-transform: uppercase; font-size: 0.875rem; background: #fafafa; }
    
    .qss-blog-scope code { background: #ececec; color: #212121; padding: 0.25rem 0.5rem; border-radius: 4px; font-family: monospace; }
    .qss-blog-scope pre { background: #191919; color: #fff; padding: 1.5rem; border-radius: 8px; overflow-x: auto; margin: 2rem 0; }
    
    .qss-blog-scope blockquote {
      border-left: 4px solid #ddd;
      padding: 1rem 1.5rem;
      margin: 2rem 0;
      background: #f7f7f8;
      font-style: italic;
      color: #333;
      text-align: left;
    }
    
    .qss-blog-scope .blog-content a, .qss-blog-scope .blog-content a:visited {
      color: #e11d1d;
      text-decoration: underline;
      font-weight: 500;
      transition: color 0.18s;
    }
    .qss-blog-scope .blog-content a:hover { color: #a60c0c; }
    
    .qss-blog-scope .interaction-bar {
      display: flex;
      gap: 18px;
      margin: 30px 0 16px 0;
      align-items: center;
      justify-content: flex-start;
    }
    .qss-blog-scope .interaction-btn {
      background: #000000;
      border: 1.4px solid #ffffff;
      padding: 7px 65px;
      border-radius: 999px;
      cursor: pointer;
      font-size: 16px;
      display: flex;
      align-items: center;
      gap: 13px;
      font-weight: 600;
      letter-spacing: 0.01em;
      color: #ffffffff;
      transition: background 0.14s, color 0.16s, border-color 0.18s, box-shadow 0.21s;
      box-shadow: 0 2px 7px 0 rgba(70,70,70,0.08);
      text-align: left;
    }
    .qss-blog-scope .interaction-btn:hover {
      background: #f4f4f4;
      color: #111;
      border-color: #bbb;
      box-shadow: 0 4px 12px 0 rgba(125,134,153,0.13);
    }
    .qss-blog-scope .interaction-btn:active {
      background: #ebedef;
      color: #1d1e22;
      border-color: #c4c9d1;
    }
    .qss-blog-scope .interaction-btn.disabled {
      background: #f9f9f9;
      color: #aaa;
      cursor: not-allowed;
      border-color: #dedede;
      box-shadow: none;
    }
    
    /* Share Popup */
    .qss-blog-scope .share-popup {
      position: absolute;
      top: -44px;
      right: 39px;
      background: #ffffff;
      border: 1px solid #ddd;
      border-radius: 50px;
      padding: 0px;
      box-shadow: 0 0px 12px rgba(0 0 0 / 50%);
      display: none;
      z-index: 1000;
      min-width: 100px;
    }
    .qss-blog-scope .share-popup.show { display: block; }
    .qss-blog-scope .share-popup button {
      background: none;
      border: none;
      padding: 8px 12px;
      cursor: pointer;
      border-radius: 4px;
      font-size: 14px;
      width: 100%;
      text-align: center;
    }
    .qss-blog-scope .share-popup button:hover { background: #f5f5f5; }
    
    .qss-blog-scope .custom-toast {
      position: fixed;
      left: 50%;
      bottom: 42px;
      transform: translateX(-50%) scale(0.97);
      background: #222;
      color: #fff;
      padding: 8px 12px;
      border-radius: 4px;
      font-size: 18px;
      font-weight: 600;
      letter-spacing: 0;
      box-shadow: 0 6px 28px rgba(10,40,90,0.11);
      z-index: 5000;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.18s cubic-bezier(.4,0,.2,1), transform 0.23s cubic-bezier(.4,0,.2,1);
    }
    .qss-blog-scope .custom-toast.show {
      opacity: 1;
      pointer-events: auto;
      transform: translateX(-50%) scale(1);
    }
    
    /* TOC Panel - Fixed for all issues */
    .qss-blog-scope .blog-toc {
      position: fixed;
      left: -340px;
      top: 100px;
      transform: none;
      width: 320px;
      max-width: 97vw;
      max-height: 420px;
      background: #fff;
      border: 1.6px solid #d2d2d2;
      border-radius: 13px;
      padding: 0 1.8rem 2.1rem 1.2rem;
      box-shadow: 0 18px 45px -8px rgba(0,0,0,0.25), 0 6px 28px -6px rgba(0,0,0,0.12);
      transition: left 0.27s cubic-bezier(0.4, 0, 0.2, 1);
      overflow-y: auto;
      z-index: 1111;
      text-align: left;
    }
    .qss-blog-scope .blog-toc.active { left: 30px; }
    
    .qss-blog-scope .blog-toc__header {
      position: sticky;
      top: 0;
      z-index: 2;
      background: #fff;
      padding: 1.35em 0 0.7em 0;
      margin-bottom: 0.7em;
      border-bottom: 1px solid #ececec;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .qss-blog-scope .blog-toc h2 {
      margin: 0;
      font-size: 1.09rem;
      font-weight: 700;
      color: #333;
      text-align: left;
      border: none;
      padding-bottom: 0;
      letter-spacing: .05em;
      background: transparent;
    }
    .qss-blog-scope .blog-toc h2::before { display: none; }
    
    .qss-blog-scope .toc-close-btn {
      background: transparent;
      border: none;
      font-size: 24px;
      color: #444;
      cursor: pointer;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      transition: background 0.2s, color 0.13s;
      z-index: 10;
    }
    .qss-blog-scope .toc-close-btn:hover { background: #efefef; color: #e11d1d; }
    
    .qss-blog-scope .blog-toc ul { list-style: none; padding: 0; margin: 0; }
    .qss-blog-scope .blog-toc li { margin-bottom: 0.5rem; }
    .qss-blog-scope .blog-toc a {
      color: #5e5e5e;
      text-decoration: none;
      font-size: 1.02rem;
      display: block;
      padding: 0.48rem 0.62rem;
      border-radius: 5px;
      font-weight: 500;
      background: none;
      transition: color 0.15s, font-weight 0.13s, background 0.18s;
      text-align: left;
    }
    .qss-blog-scope .blog-toc a:hover,
    .qss-blog-scope .blog-toc a:focus {
      color: #111;
      font-weight: 700;
      background: none;
    }
    .qss-blog-scope .blog-toc a.active {
      color: #111;
      font-weight: 700;
      background: none;
    }
    
    .qss-blog-scope .blog-toc-toggle {
      position: fixed;
      left: -350px;
      top: 101px;
      background: #111;
      color: #fff;
      border: none;
      padding: 13px 38px 13px 23px;
      border-radius: 0 18px 18px 0;
      cursor: pointer;
      font-size: 16px;
      font-weight: 800;
      box-shadow: 0 5px 24px rgba(0,0,0,0.10);
      transition: left 0.28s cubic-bezier(0.4, 0, 0.2, 1), background 0.17s;
      z-index: 2222;
      writing-mode: initial;
      text-orientation: initial;
      letter-spacing: 0.105em;
      text-transform: uppercase;
      text-align: left;
      min-width: 210px;
      display: block;
    }
    .qss-blog-scope .blog-toc-toggle.show { left: 0; }
    .qss-blog-scope .blog-toc-toggle.hide { display: none !important; }
    .qss-blog-scope .blog-toc-toggle:hover, .qss-blog-scope .blog-toc-toggle:focus { background: #222; color: #fff; }
    .qss-blog-scope .blog-toc.active ~ .qss-blog-scope .blog-toc-toggle, .qss-blog-scope .blog-toc.active + .qss-blog-scope .blog-toc-toggle { display: none !important; }

    /* EXACT MOBILE CSS FROM YOUR PERFECT OLD VERSION - FULLY RESTORED */
    @media (max-width: 900px) {
      .qss-blog-scope .blog-toc-toggle {
        left: 12px !important;
        top: 56px !important;
        bottom: unset !important;
        right: unset !important;
        transform: none !important;
        border-radius: 999px;
        padding: 9px 13px 9px 19px;
        font-size: 15px;
        min-width: 110px;
        z-index: 2222;
      }
      .qss-blog-scope .blog-toc {
        top: 94px !important;
        left: -99vw;
        width: 95vw;
        max-width: 99vw;
        padding: 0 2vw 1.2rem 2vw;
      }
      .qss-blog-scope .blog-toc__header { 
        padding: 1em 0;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .qss-blog-scope .blog-toc.active { left: 7px !important; }
    }
    
    @media (max-width:768px){
      .qss-blog-scope .blog-container{ padding: 20px 2vw 0 2vw; }
      .qss-blog-scope .interaction-bar{ gap:9px; position:relative; }
      .qss-blog-scope .share-popup{ position:absolute; top:-50px; right:0; }
      .qss-blog-scope .blog-content { max-width: 99vw; }
      .qss-blog-scope .blog-toc-toggle { font-size: 14px; min-width: 110px; position: sticky; top: 80px !important; }
    }
    
    @media (min-width: 992px) {
      .qss-blog-scope .o_container_small {
        max-width: 900px !important;
      }
    }
    </style>

    <script>
      document.addEventListener('DOMContentLoaded', function(){
        const scope = document.querySelector('.qss-blog-scope');
        if (!scope) return;

        function showToast(msg) {
          const toast = scope.querySelector('#custom-toast');
          if (!toast) return;
          toast.textContent = msg;
          toast.classList.add('show');
          setTimeout(() => toast.classList.remove('show'), 1600);
        }
        
        // Share functionality
        const shareBtn = scope.querySelector('#share-btn');
        const sharePopup = scope.querySelector('#share-popup');
        if (shareBtn && sharePopup) {
          shareBtn.onclick = function(e) {
            e.stopPropagation();
            sharePopup.classList.toggle('show');
          };
          const copyBtn = scope.querySelector('#copy-link-btn');
          if (copyBtn) {
            copyBtn.onclick = function() {
              navigator.clipboard.writeText(window.location.href)
                .then(()=> {
                  showToast('Link copied!');
                  sharePopup.classList.remove('show');
                })
                .catch(()=> {
                  showToast('Copy failed.');
                  sharePopup.classList.remove('show');
                });
            };
          }
          document.addEventListener('click', function(e) {
            if (!shareBtn.contains(e.target) && !sharePopup.contains(e.target)) {
              sharePopup.classList.remove('show');
            }
          });
        }
        
        // TOC functionality - Fixed for all issues
        const tocToggle = scope.querySelector('.blog-toc-toggle');
        const tocPanel = scope.querySelector('.blog-toc');
        const tocCloseBtn = scope.querySelector('.toc-close-btn');
        
        if (tocToggle && tocPanel && tocCloseBtn) {
          const bannerHeight = 200;
          window.addEventListener('scroll', function() {
            const scrollPos = window.scrollY;
            if (scrollPos > bannerHeight) tocToggle.classList.add('show');
            else {
              tocToggle.classList.remove('show');
              tocPanel.classList.remove('active');
              tocToggle.classList.remove('hide');
            }
            const h2s = scope.querySelectorAll('h2');
            if (h2s.length) {
              let activeIdx = null;
              h2s.forEach(function(h2, i) {
                if (scrollPos >= h2.offsetTop - 150) activeIdx = i;
              });
              scope.querySelectorAll('.blog-toc a').forEach(function(a, i) {
                a.classList.toggle('active', i === activeIdx);
              });
            }
          });
          tocToggle.onclick = function() {
            tocPanel.classList.add('active');
            tocToggle.classList.add('hide');
          };
          tocCloseBtn.onclick = function() {
            tocPanel.classList.remove('active');
            tocToggle.classList.remove('hide');
          };
          scope.querySelectorAll('.blog-toc a').forEach(function(a) {
            a.addEventListener('click', function(e) {
              e.preventDefault();
              const tgt = document.getElementById(a.getAttribute('href').slice(1));
              if (tgt) {
                const rect = tgt.getBoundingClientRect();
                const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                const wantTop = window.innerHeight * 0.25;
                const actualY = rect.top + scrollTop - wantTop;
                window.scrollTo({top: actualY, behavior: 'smooth'});
                tocPanel.classList.remove('active');
                tocToggle.classList.remove('hide');
              }
            });
          });
        }
      });
    </script>

    <!-- Uploaded by: ${uploader} -->
    <div class="qss-blog-scope">
      <div class="blog-container">
        <div class="interaction-bar">
          <div style="position:relative;">
            <button id="share-btn" class="interaction-btn">Share</button>
            <div id="share-popup" class="share-popup">
              <button id="copy-link-btn">Copy Link</button>
            </div>
          </div>
        </div>
        <div class="blog-content">
          <button class="blog-toc-toggle">TABLE OF CONTENT</button>
          <div class="blog-toc">
            <div class="blog-toc__header">
              <h2>Table of Contents</h2>
              <button class="toc-close-btn" title="Close">&times;</button>
            </div>
            <ul>${toc}</ul>
          </div>
          ${updatedHTML}
        </div>
        <div id="custom-toast" class="custom-toast">Link copied!</div>
      </div>
    </div>
  `;
}

module.exports = { generateBlogTemplate };
