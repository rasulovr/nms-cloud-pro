// Domain selection is public routing, never authorization for private RMS data.
export const reservedTenantNames = new Set(['www', 'app', 'login', 'auth', 'api', 'admin', 'mail', 'smtp', 'send', 'status', 'support', 'docs', 'cdn', 'assets', 'static']);
export function tenantSlug(hostname) {
  const host = String(hostname).toLowerCase().replace(/\.$/, '');
  if (!host.endsWith('.rms.rest')) return null;
  const slug = host.slice(0, -9);
  if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(slug) || reservedTenantNames.has(slug)) return null;
  return slug;
}
let resolvedMenu = null;
export const getTenantMenu = () => resolvedMenu;

export async function prepareTenantDomain({ root, supabaseUrl, supabaseKey }) {
  const slug = tenantSlug(window.location.hostname);
  if (!slug) return true;
  const params = new URLSearchParams(window.location.search);
  function show(title, description, branches = []) {
    root.replaceChildren();
    const main = document.createElement('main');
    main.className = 'rms-startup';
    const card = document.createElement('section');
    card.className = 'rms-startup-card';
    const heading = document.createElement('h1');
    heading.textContent = title;
    const copy = document.createElement('p');
    copy.textContent = description;
    card.append(heading, copy);
    for (const branch of branches) {
      const link = document.createElement('a');
      const url = new URL(window.location.href);
      url.search = '';
      url.hash = '';
      url.searchParams.set('branch', branch.code);
      link.href = url.href;
      link.textContent = branch.name;
      link.style.cssText = 'display:block;padding:14px;margin-top:12px;border:1px solid #dce6f2;border-radius:12px;color:inherit;text-decoration:none';
      card.append(link);
    }
    main.append(card);
    root.append(main);
  }
  try {
    const response = await fetch(`${supabaseUrl.replace(/\/$/, '')}/rest/v1/rpc/qr_resolve_public_domain`, {
      method: 'POST',
      headers: { apikey: supabaseKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_slug: slug, p_branch_code: params.get('branch'), p_table_code: params.get('table') }),
      signal: AbortSignal.timeout(15000)
    });
    if (!response.ok) throw new Error('Domain lookup failed');
    const result = await response.json();
    if (result?.status === 'choose_branch') {
      show(result.name, 'Выберите заведение', result.branches);
      return false;
    }
    if (result?.status !== 'ready' || !result.menu?.branch?.code) {
      show(result?.name || 'RMS QR Menu', result?.status === 'not_found' ? 'Заведение не найдено.' : 'Меню готовится к публикации.');
      return false;
    }
    resolvedMenu = result.menu;
    document.title = result.menu.organization.name;
    // Replace only routing parameters, preserving table and language links.
    params.set('qr', 'menu');
    params.set('qr_source', 'admin');
    params.set('branch', result.menu.branch.code);
    params.delete('organization');
    window.history.replaceState(null, '', `${window.location.pathname}?${params}${window.location.hash}`);
    return true;
  } catch (_) {
    show('Меню временно недоступно', 'Попробуйте обновить страницу через минуту.');
    return false;
  }
}
