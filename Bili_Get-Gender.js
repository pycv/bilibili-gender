// ==UserScript==
// @name         Bilibili-Gender
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  在B站评论区添加性别符号
// @author       你的名字
// @match        https://www.bilibili.com/*
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    const processedComments = new Set(); // 用于跟踪已处理的评论

    function waitForCommentsLoaded() {
        const commentsContainer = document.querySelector("#commentapp > bili-comments");
        if (commentsContainer) {
            console.log('[BiliBili Gender] 评论区已加载.');
            addGenderSymbols();
            const observer = new MutationObserver((mutations) => {
                if (mutations.some(mutation => mutation.type === 'childList')) {
                    console.log('[BiliBili Gender] 检测到新评论，将在500毫秒后处理...');
                    setTimeout(addGenderSymbols, 500);
                }
            });
            observer.observe(commentsContainer.shadowRoot, { childList: true, subtree: true });
        } else {
            console.log('[BiliBili Gender] 评论区未加载，将在1秒后重试...');
            setTimeout(waitForCommentsLoaded, 1000);
        }
    }

    function addGenderSymbols() {
        const commentsContainer = document.querySelector("#commentapp > bili-comments");
        if (!commentsContainer) {
            console.log('[BiliBili Gender] 未找到评论容器，稍后重试...');
            setTimeout(addGenderSymbols, 500);
            return;
        }

        const shadowRoot = commentsContainer.shadowRoot;
        if (!shadowRoot) {
            console.log('[BiliBili Gender] 未找到 Shadow DOM，稍后重试...');
            setTimeout(addGenderSymbols, 500);
            return;
        }

        const feed = shadowRoot.querySelector("#feed");
        if (!feed) {
            console.log('[BiliBili Gender] 未找到 #feed 元素，稍后重试...');
            setTimeout(addGenderSymbols, 500);
            return;
        }

        const commentThreads = feed.querySelectorAll("bili-comment-thread-renderer");
        if (commentThreads.length === 0) {
            console.log('[BiliBili Gender] 未找到评论线程，稍后重试...');
            setTimeout(addGenderSymbols, 500);
            return;
        }

        commentThreads.forEach((comment) => {
            const rpid = comment.__data.rpid; // 获取唯一的 rpid
            if (!processedComments.has(rpid)) {
                try {
                    processedComments.add(rpid);
                    const userInfo = comment.shadowRoot.querySelector("#comment").shadowRoot.querySelector("#header > bili-comment-user-info");
                    if (userInfo) {
                        const gender = userInfo.__data.member.sex;
                        let genderIcon = ''; // 默认未知
                        if (gender === '男') {
                            genderIcon = '<span class="gender male">♂</span>';
                        } else if (gender === '女') {
                            genderIcon = '<span class="gender female">♀</span>';
                        }

                        const infoElement = userInfo.shadowRoot.querySelector("#info");
                        if (infoElement) {
                            const style = document.createElement('style');
                            style.innerHTML = `
                                .gender {
                                    display: flex;
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
                                .male {
                                    background-color: #00AEEC;
                                }
                                .female {
                                    background-color: #ff6699;
                                }
                            `;
                            infoElement.appendChild(style);

                            const genderElement = document.createElement('span');
                            genderElement.innerHTML = genderIcon;
                            infoElement.appendChild(genderElement);
                        }
                        console.log(`[BiliBili Gender] 已处理评论，rpid: ${rpid}.`);
                    }
                } catch (error) {
                    console.error(`[BiliBili Gender] 处理评论 rpid: ${rpid} 时出错:`, error);
                }
            }
        });
    }

    waitForCommentsLoaded();
})();