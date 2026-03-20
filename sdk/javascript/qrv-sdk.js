export class QRVClient {
  constructor({ baseUrl = 'https://api.qrv.network', apiKey } = {}) {
    this.baseUrl = baseUrl
    this.apiKey = apiKey
  }

  async verify(qrvid) {
    const res = await fetch(`${this.baseUrl}/verify/${qrvid}`)
    if (!res.ok) throw new Error('Verification failed')
    return await res.json()
  }

  async createRecord(payload) {
    const res = await fetch(`${this.baseUrl}/registry/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(payload)
    })

    if (!res.ok) throw new Error('Create failed')
    return await res.json()
  }

  async revoke(qrvid) {
    const res = await fetch(`${this.baseUrl}/revoke`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({ qrvid })
    })

    if (!res.ok) throw new Error('Revoke failed')
    return await res.json()
  }
}
