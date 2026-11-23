import sys, asyncio, certifi
certifi.where = lambda: '/root/.ccr/ca-bundle.crt'
import edge_tts
async def main(text, voice, rate, pitch, out, vol='+0%'):
    c = edge_tts.Communicate(text, voice, rate=rate, pitch=pitch, volume=vol)
    await c.save(out)
asyncio.run(main(*sys.argv[1:]))
