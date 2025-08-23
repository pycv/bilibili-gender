// ==UserScript==
// @name         Bilibili-Gender
// @namespace    http://tampermonkey.net/
// @version      0.3
// @description  在B站评论区添加性别符号
// @author       pycv
// @icon         https://www.bilibili.com/favicon.ico
// @match        https://www.bilibili.com/*
// @grant        none
// @run-at       document-end
// @downloadURL https://update.greasyfork.org/scripts/526114/Bilibili-Gender.user.js
// @updateURL https://update.greasyfork.org/scripts/526114/Bilibili-Gender.meta.js
// ==/UserScript==

(function() {
    'use strict';

    const processedComments = new Set();
    let observer = null;
    let cleanupTimer = null;
    let retryCount = 0;
    const MAX_RETRIES = 20;

    // 注入样式到Shadow DOM
    function injectStyle(shadowRoot) {
        if (shadowRoot.querySelector('#bili-gender-style')) return;
        
        const style = document.createElement('style');
        style.id = 'bili-gender-style';
        style.innerHTML = `
            .bili-gender {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: 14px;
                height: 14px;
                border-radius: 50%;
                font-size: 10px;
                color: white;
                margin-right: 5px;
                font-weight: bold;
                padding: 1px;
                box-sizing: border-box;
                transform: rotate(45deg);
                font-family: "Alibaba PuHuiTi 3.0", "PingFang SC", HarmonyOS_Regular, "Helvetica Neue", "Microsoft YaHei", sans-serif;
            }
            .bili-gender.male { background-color: #00AEEC; }
            .bili-gender.female { background-color: #ff6699; }
        `;
        shadowRoot.appendChild(style);
    }

    // 防抖函数（修复计时器泄露问题）
    function debounce(func, delay) {
        let timer = null;
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => func(...args), delay);
        };
    }

    // 处理单个评论
    function processComment(comment) {
        try {
            const rpid = comment.__data?.rpid;
            if (!rpid || processedComments.has(rpid)) return false;
            
            const userInfo = comment.shadowRoot?.querySelector('#comment')?.shadowRoot?.querySelector('#header > bili-comment-user-info');
            if (!userInfo) return false;
            
            const gender = userInfo.__data?.member?.sex;
            if (!gender || (gender !== '男' && gender !== '女')) return false;
            
            const infoElement = userInfo.shadowRoot?.querySelector('#info');
            if (!infoElement || infoElement.querySelector('.bili-gender')) return false;
            
            // 注入样式并创建元素
            injectStyle(userInfo.shadowRoot);
            
            const genderElement = document.createElement('span');
            genderElement.className = `bili-gender ${gender === '男' ? 'male' : 'female'}`;
            genderElement.textContent = gender === '男' ? '♂' : '♀';
            genderElement.title = `性别: ${gender}`;
            
            infoElement.appendChild(genderElement);
            
            // 只有成功处理后才添加到已处理列表
            processedComments.add(rpid);
            return true;
        } catch (error) {
            console.error('[BiliBili Gender] 处理评论出错:', error);
            return false;
        }
    }

    // 批量处理评论
    function addGenderSymbols() {
        const commentsContainer = document.querySelector('#commentapp > bili-comments');
        if (!commentsContainer?.shadowRoot) {
            if (retryCount < MAX_RETRIES) {
                retryCount++;
                setTimeout(addGenderSymbols, 1000);
            } else {
                console.warn('[BiliBili Gender] 超过最大重试次数，停止尝试');
            }
            return;
        }
        
        const commentThreads = commentsContainer.shadowRoot.querySelector('#feed')?.querySelectorAll('bili-comment-thread-renderer');
        if (!commentThreads?.length) {
            if (retryCount < MAX_RETRIES) {
                retryCount++;
                setTimeout(addGenderSymbols, 500);
            }
            return;
        }
        
        // 重置重试计数器
        retryCount = 0;
        
        let count = 0;
        commentThreads.forEach(comment => {
            if (processComment(comment)) count++;
        });
        
        if (count > 0) {
            console.log(`[BiliBili Gender] 处理了 ${count} 条新评论`);
        }
    }

    // 设置监听器
    function setupObserver() {
        const commentsContainer = document.querySelector('#commentapp > bili-comments');
        if (!commentsContainer?.shadowRoot) {
            if (retryCount < MAX_RETRIES) {
                retryCount++;
                setTimeout(setupObserver, 1000);
            } else {
                console.warn('[BiliBili Gender] 无法找到评论区，停止尝试');
            }
            return;
        }
        
        if (observer) observer.disconnect();
        
        const debouncedProcess = debounce(addGenderSymbols, 300);
        
        observer = new MutationObserver((mutations) => {
            const hasNewComments = mutations.some(mutation => 
                mutation.type === 'childList' && 
                Array.from(mutation.addedNodes).some(node => 
                    node.nodeType === 1 && 
                    (node.tagName === 'BILI-COMMENT-THREAD-RENDERER' || node.querySelector?.('bili-comment-thread-renderer'))
                )
            );
            
            if (hasNewComments) debouncedProcess();
        });
        
        observer.observe(commentsContainer.shadowRoot, { childList: true, subtree: true });
        console.log('[BiliBili Gender] 监听器已启动');
    }

    // 清理资源
    function cleanup() {
        if (observer) {
            observer.disconnect();
            observer = null;
        }
        if (cleanupTimer) {
            clearInterval(cleanupTimer);
            cleanupTimer = null;
        }
        processedComments.clear();
        console.log('[BiliBili Gender] 资源已清理');
    }

    // 初始化
    function init() {
        addGenderSymbols();
        setupObserver();
        
        // 定期清理过多的已处理记录
        cleanupTimer = setInterval(() => {
            if (processedComments.size > 1000) {
                const items = Array.from(processedComments);
                processedComments.clear();
                items.slice(-500).forEach(id => processedComments.add(id));
                console.log('[BiliBili Gender] 已清理过多的已处理记录');
            }
        }, 60000);
        
        // 监听页面卸载，清理资源
        window.addEventListener('beforeunload', cleanup);
        window.addEventListener('pagehide', cleanup);
    }

    // 启动
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();