# Puerta's Tibia Map Visualizer

![Node.js](https://img.shields.io/badge/Node.js-20%2B-339933?style=for-the-badge&logo=node.js&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=20232A)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Express](https://img.shields.io/badge/Express-API-000000?style=for-the-badge&logo=express&logoColor=white)
![Leaflet](https://img.shields.io/badge/Leaflet-Maps-199900?style=for-the-badge&logo=leaflet&logoColor=white)
![Status](https://img.shields.io/badge/status-em%20desenvolvimento-f59e0b?style=for-the-badge)
![License](https://img.shields.io/badge/licen%C3%A7a-educacional-8b5cf6?style=for-the-badge)

Aplicacao web local para visualizar, marcar e exportar mapas do Tibia a partir dos arquivos de minimapa do jogo.

O projeto combina um backend em Node.js/Express, responsavel por ler e processar arquivos locais, com um frontend em React/Vite que exibe o mapa com Leaflet e permite desenhar marcacoes sobre cada andar.

## Sumario

- [Preview](#preview)
- [Recursos](#recursos)
- [Stack](#stack)
- [Requisitos](#requisitos)
- [Como Rodar](#como-rodar)
- [Fluxo de Uso](#fluxo-de-uso)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [API Principal](#api-principal)
- [Build](#build)
- [Troubleshooting](#troubleshooting)
- [Licenca](#licenca)

## Preview

```txt
Backend local + Frontend web + arquivos de minimapa do Tibia

Minimap_Color_*.png
        |
        v
  Importacao e tiles
        |
        v
Visualizador por andar + marcacoes + exportacao PNG
```

## Recursos

- Visualizacao interativa do mapa com zoom e pan.
- Seletor de andares baseado nos arquivos detectados.
- Carregamento de tiles sob demanda por andar.
- Ferramentas de desenho com Fabric.js.
- Marcacoes em JSON, separadas dos arquivos originais.
- Camada opcional com nomes de lugares.
- Exportacao PNG do andar atual, mapa limpo da superficie e Super Mapa.
- Tutorial integrado na interface.
- Tema escuro responsivo para desktop e tablet.

## Stack

| Camada | Tecnologias |
| --- | --- |
| Backend | Node.js, Express, TypeScript, Sharp |
| Frontend | React, Vite, TypeScript, Leaflet, Fabric.js, Axios |
| Dados locais | PNG, JSON, tiles por andar |

## Requisitos

- Node.js 20 ou superior
- npm 10 ou superior
- Arquivos de minimapa do Tibia

No Windows, a pasta de minimapa costuma ficar em:

```txt
C:\Users\<usuario>\AppData\Local\Tibia\packages\Tibia\minimap
```

## Como Rodar

Clone o repositorio e instale as dependencias do backend e do frontend separadamente.

### Backend

```powershell
cd backend
npm install
npm run dev
```

O backend roda em:

```txt
http://localhost:3333
```

### Frontend

Em outro terminal:

```powershell
cd frontend
npm install
npm run dev
```

O frontend roda em:

```txt
http://localhost:5173
```

## Fluxo de Uso

1. Inicie o backend.
2. Inicie o frontend.
3. Abra `http://localhost:5173`.
4. Clique em **Atualizar Recursos** para carregar os arquivos locais ja presentes no projeto.
5. Use o seletor lateral para trocar de andar.
6. Use as ferramentas de desenho para criar marcacoes.
7. Salve ou carregue marcacoes em JSON.
8. Exporte o mapa em PNG pelo painel de exportacao.

## Estrutura do Projeto

```txt
.
|-- backend/                 # API Node.js + Express + TypeScript
|   |-- src/
|   |   |-- routes/          # Rotas REST
|   |   |-- services/        # Importacao, tiles, exportacao e projetos
|   |   |-- types/           # Tipos compartilhados
|   |   `-- utils/           # Utilitarios de arquivos e coordenadas
|   |-- package.json
|   `-- tsconfig.json
|
|-- frontend/                # React + Vite + TypeScript
|   |-- src/
|   |   |-- components/      # Componentes da interface
|   |   |-- services/        # Cliente HTTP
|   |   |-- types/           # Tipos do frontend
|   |   `-- styles/          # CSS global
|   |-- package.json
|   `-- vite.config.ts
|
|-- data/                    # Dados gerados/localmente importados
|   |-- annotations/         # Marcacoes em JSON
|   |-- maps/                # Mapas originais e importados
|   |-- projects/            # Configuracoes de projeto
|   `-- tiles/               # Tiles processados por andar
|
|-- resources/               # Recursos locais de minimapa
|-- specs.md                 # Especificacao do projeto
`-- README.md
```

## API Principal

### Geral

- `GET /api/health` - verifica se o backend esta online.

### Mapas

- `POST /api/maps/import` - importa arquivos de uma pasta local.
- `GET /api/maps/floors` - lista andares importados.
- `POST /api/maps/tiles/generate` - gera tiles a partir dos mapas importados.
- `POST /api/maps/refresh` - atualiza recursos e tiles disponiveis.
- `GET /api/maps/status` - retorna quantidade de arquivos e andares detectados.

### Tiles

- `GET /api/tiles/:floor/metadata` - retorna metadados de tiles de um andar.
- `GET /api/tiles/:floor/:baseX/:baseY` - retorna a imagem de um tile.

### Marcacoes

- `GET /api/annotations/:floor` - carrega marcacoes de um andar.
- `POST /api/annotations/:floor` - salva/cria marcacoes.
- `DELETE /api/annotations/:floor/:id` - remove uma marcacao.

### Exportacao

- `POST /api/export/floor` - exporta o andar atual em PNG.
- `POST /api/export/global-clean` - exporta a superficie limpa em PNG.
- `POST /api/export/super-map` - exporta o Super Mapa em PNG.

## Build

### Backend

```powershell
cd backend
npm run build
npm start
```

### Frontend

```powershell
cd frontend
npm run build
npm run preview
```

Os arquivos compilados ficam na pasta `dist/` de cada aplicacao.

## Dados Locais

O projeto usa a pasta `data/` para armazenar arquivos importados, tiles processados, marcacoes e configuracoes. Esses arquivos podem ficar grandes dependendo da quantidade de mapas do Tibia.

Os arquivos originais do Tibia nao sao modificados. O backend trabalha com copias internas e dados gerados pelo projeto.

## Troubleshooting

### Porta 3333 em uso

```powershell
netstat -ano | findstr :3333
taskkill /PID <PID> /F
```

### Porta 5173 em uso

```powershell
netstat -ano | findstr :5173
taskkill /PID <PID> /F
```

### Nenhum andar carregado

- Verifique se existem arquivos `Minimap_Color_*.png`.
- Confirme se a pasta `data/maps/original/` possui imagens.
- Rode o backend e clique em **Atualizar Recursos**.
- Confira o console do backend e do navegador.

## Licenca

Projeto educacional para visualizacao local de mapas do Tibia.
