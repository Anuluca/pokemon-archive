/**
 * 失效历史活动的本地浏览流程。
 * 保留两个不同日期的原始表单，答案和个人信息均不发送、不持久保存。
 */
(() => {
  const form = document.querySelector('[data-archive-event-stage]');
  if (!form) return;
  // 旧表单使用提交图片；用原生提交事件兼容鼠标与键盘，阻断已下线的 PHP 后端。
  const status = document.createElement('p');
  status.className = 'archive-event-notice';
  status.setAttribute('role', 'status');
  form.appendChild(status);
  form.addEventListener('submit', event => {
    event.preventDefault();
    event.stopImmediatePropagation();
    if (form.dataset.archiveEventStage === 'quiz') {
      for (const name of ['q-1', 'q-2', 'q-3']) {
        if (!form.querySelector(`input[name="${name}"]:checked`)) {
          status.textContent = '请先回答三个竞猜问题，再查看信息填报页。';
          form.querySelector(`input[name="${name}"]`)?.focus();
          return;
        }
      }
      // 仅跳转到静态页面；不把任何字段放进查询参数或浏览器存储。
      window.location.assign(form.dataset.nextPage);
    } else {
      status.textContent = '历史活动已结束。本页不会提交、上传或保存填写内容。';
      status.scrollIntoView({block: 'center'});
    }
  }, true);
})();
