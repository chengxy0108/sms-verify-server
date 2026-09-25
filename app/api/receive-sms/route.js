import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// 每次请求创建独立 client；关闭 keep-alive，避免 Vercel serverless 连接池复用卡死
function getSupabase() {
  if (!supabaseUrl || !supabaseAnonKey) {
    return null
  }
  try {
    return createClient(supabaseUrl, supabaseAnonKey, {
      fetch: (url, init) => {
        const opts = { ...init, headers: { ...(init?.headers || {}), 'Cache-Control': 'no-cache' } }
        // Node fetch 默认 keep-alive；显式关掉
        if (opts.headers) opts.headers['Connection'] = 'close'
        return fetch(url, opts)
      },
    })
  } catch (e) {
    console.error('createClient failed', e)
    return null
  }
}

function extractCode(raw = '') {
  if (!raw) return ''
  const text = String(raw)
  let m = text.match(/(?:验证码|verification code|code|码)\s*[:：]?\s*(\d{4,8})/i)
  if (m) return m[1]
  m = text.match(/(?:^|\D)(\d{4,6})(?:\D|$)/)
  if (m) return m[1]
  m = text.match(/\d{4,6}/)
  return m ? m[1] : ''
}

export async function POST(req) {
  let body
  try {
    body = await req.json()
  } catch (e) {
    return Response.json({ success: false, error: 'body 不是合法 JSON' }, { status: 400 })
  }

  const phone = body.phone || body.mobile || ''
  const raw = body.raw || body.msg_content || body.content || body.sms || ''
  const providedCode = body.verify_code || body.code || ''
  const device = body.device || ''
  const ts = body.ts || Date.now()
  const code = (providedCode && String(providedCode).trim()) || extractCode(raw)

  if (!raw && !code) {
    return Response.json({ success: false, error: 'raw 和 code 至少传一个' }, { status: 400 })
  }

  const row = {
    phone: phone || null,
    verify_code: code || null,
    msg_content: raw || null,
    device: device || null,
    source_ts: ts || null,
  }

  const supabase = getSupabase()
  if (!supabase) {
    return Response.json(
      { success: false, error: 'Supabase 未配置（缺 NEXT_PUBLIC_SUPABASE_URL / ANON_KEY 或 client 创建失败）', row },
      { status: 500 }
    )
  }

  try {
    const { data, error } = await supabase.from('sms_records').insert([row])
    if (error) {
      return Response.json({ success: false, error: error.message, row }, { status: 400 })
    }
    return Response.json({ success: true, data, code })
  } catch (e) {
    // 网络层错误（fetch failed / DNS / TLS）单独捕获，给出更明确提示
    return Response.json(
      { success: false, error: `网络层失败: ${e?.message || e}`, row, url: supabaseUrl },
      { status: 502 }
    )
  }
}
