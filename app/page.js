'use client'
import { createClient } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function Home() {
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')

  async function loadRecords() {
    setLoading(true)
    setErr('')
    const { data, error } = await supabase
      .from('sms_records')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)
    if (error) {
      setErr('加载失败：' + error.message)
    } else {
      setList(data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    loadRecords()
    const timer = setInterval(loadRecords, 8000)
    return () => clearInterval(timer)
  }, [])

  return (
    <main style={{ padding: 24, fontFamily: 'system-ui, sans-serif', background: '#0f1117', color: '#e6e6e6', minHeight: '100vh' }}>
      <h1 style={{ margin: '0 0 4px' }}>短信验证码接收后台</h1>
      <p style={{ color: '#8b93a7', marginTop: 0 }}>
        实时展示 App 推送的短信（每 8 秒自动刷新）。点「手动刷新」或按 F5。
        <button
          onClick={loadRecords}
          style={{ marginLeft: 12, padding: '4px 10px', background: '#0F4C5C', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}
        >
          手动刷新
        </button>
      </p>
      {err && <div style={{ color: '#ff8080', marginBottom: 12 }}>{err}</div>}
      {loading && list.length === 0 ? (
        <p style={{ color: '#8b93a7' }}>加载中…</p>
      ) : list.length === 0 ? (
        <p style={{ color: '#8b93a7' }}>暂无记录。装好 App、授权通知监听后，收到短信会自动推到这里。</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table border="1" cellPadding="10" style={{ width: '100%', borderCollapse: 'collapse', background: '#181c26' }}>
            <thead>
              <tr style={{ background: '#10131a', color: '#9aa4bf' }}>
                <th style={{ textAlign: 'left' }}>时间</th>
                <th style={{ textAlign: 'left' }}>手机号</th>
                <th style={{ textAlign: 'left' }}>验证码</th>
                <th style={{ textAlign: 'left' }}>原始短信</th>
                <th style={{ textAlign: 'left' }}>设备</th>
              </tr>
            </thead>
            <tbody>
              {list.map((item) => (
                <tr key={item.id} style={{ borderLeft: item.verify_code ? '3px solid #2e8b57' : '3px solid #8b93a7' }}>
                  <td style={{ whiteSpace: 'nowrap' }}>{new Date(item.created_at).toLocaleString('zh-CN')}</td>
                  <td>{item.phone || '—'}</td>
                  <td style={{ fontWeight: 600, fontSize: 16, color: item.verify_code ? '#5fd0a0' : '#8b93a7' }}>
                    {item.verify_code || '未识别'}
                  </td>
                  <td style={{ maxWidth: 420, wordBreak: 'break-all' }}>{item.msg_content || '—'}</td>
                  <td>{item.device || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  )
}
