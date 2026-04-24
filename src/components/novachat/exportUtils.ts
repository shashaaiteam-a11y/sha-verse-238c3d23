import { Message } from '@/hooks/useNovaChat';

export function exportAsMarkdown(title: string, messages: Message[]): string {
  const lines: string[] = [];
  lines.push(`# ${title || 'NovaChat Conversation'}`);
  lines.push('');
  lines.push(`*Exported from NovaChat on ${new Date().toLocaleString()}*`);
  lines.push('');
  lines.push('---');
  lines.push('');
  for (const m of messages) {
    const who = m.role === 'user' ? '🧑 **You**' : '🤖 **NovaChat**';
    lines.push(who);
    lines.push('');
    lines.push(m.content || '');
    lines.push('');
  }
  return lines.join('\n');
}

export function downloadMarkdown(title: string, messages: Message[]) {
  const md = exportAsMarkdown(title, messages);
  const safe = (title || 'novachat').replace(/[^a-z0-9-_]+/gi, '_').slice(0, 50);
  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${safe}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadAsHtml(title: string, messages: Message[]) {
  const safe = (title || 'novachat').replace(/[^a-z0-9-_]+/gi, '_').slice(0, 50);
  const escape = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const body = messages.map(m => `
    <div class="msg ${m.role}">
      <div class="who">${m.role === 'user' ? 'You' : 'NovaChat'}</div>
      <pre>${escape(m.content || '')}</pre>
    </div>`).join('');
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escape(title)}</title>
<style>
body { font-family: -apple-system, system-ui, sans-serif; max-width: 760px; margin: 2rem auto; padding: 0 1rem; line-height: 1.6; color: #111; background: #fff; }
h1 { border-bottom: 1px solid #ddd; padding-bottom: .5rem; }
.msg { margin: 1.5rem 0; padding: 1rem; border-radius: 12px; }
.msg.user { background: #f3f4f6; }
.msg.assistant { background: #ecfdf5; }
.who { font-weight: 600; margin-bottom: .5rem; font-size: .9rem; color: #374151; }
pre { white-space: pre-wrap; font-family: inherit; margin: 0; }
@media print { .msg { break-inside: avoid; } }
</style></head><body>
<h1>${escape(title || 'NovaChat Conversation')}</h1>
<p><em>Exported on ${new Date().toLocaleString()}</em></p>
${body}
</body></html>`;
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${safe}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function printConversation(title: string, messages: Message[]) {
  const safe = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const body = messages.map(m => `
    <div class="msg ${m.role}">
      <div class="who">${m.role === 'user' ? 'You' : 'NovaChat'}</div>
      <pre>${safe(m.content || '')}</pre>
    </div>`).join('');
  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(`<!DOCTYPE html><html><head><title>${safe(title)}</title>
<style>
body { font-family: system-ui, sans-serif; max-width: 760px; margin: 2rem auto; padding: 0 1rem; line-height: 1.6; }
h1 { border-bottom: 1px solid #ddd; padding-bottom: .5rem; }
.msg { margin: 1.5rem 0; padding: 1rem; border-radius: 8px; page-break-inside: avoid; }
.msg.user { background: #f3f4f6; }
.msg.assistant { background: #ecfdf5; }
.who { font-weight: 600; margin-bottom: .5rem; }
pre { white-space: pre-wrap; font-family: inherit; margin: 0; }
</style></head><body>
<h1>${safe(title || 'NovaChat')}</h1>
${body}
</body></html>`);
  w.document.close();
  setTimeout(() => w.print(), 300);
}
