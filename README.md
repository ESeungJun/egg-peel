# 계란 까는 주방

유튜브 틀어 놓고 삶은 계란을 탁! 깨서 문질러 까는 3D 주방 놀이예요.

- 더미에서 계란을 집어 위로 들었다가 작업대에 빠르게 내리치면 금이 가요. 쥐는 각도가 매번 달라서 금 모양도 매번 달라요.
- 금 간 계란을 누르면 가운데로 와요. 금 간 조각을 잡고 문지르면 껍질이 줄줄이 떨어져요.
- 다 깐 계란은 접시에 쌓이고, 가끔 들어오는 주문을 채워요.
- 벽걸이 TV에 유튜브 링크를 넣으면 그대로 틀어져요.

## 개발

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # 타입 검사 + dist/
npm run deploy   # Cloudflare Pages(egg-peel)
```

three.js 0.187 · TypeScript · Vite. 서버 없이 브라우저 안에서만 돌고, 기록은 `localStorage`에 남아요.

문서: [기획서](docs/기획서.md) · [설계서](docs/설계서.md) · [구현도](docs/구현도.md) · [결정기록](docs/결정기록.md)

## 브랜치

git flow: `main`(릴리스) · `develop`(작업) · `feature/*` · `release/*` · `hotfix/*`, 태그는 `vX.Y.Z`.
