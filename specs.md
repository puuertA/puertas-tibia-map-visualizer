# Especificação do Projeto: Tibia Map Editor

## Objetivo Geral

Criar um web-app local para visualizar, organizar, editar e exportar mapas do Tibia a partir dos arquivos de minimapa existentes na pasta local do jogo.

O sistema deve permitir que o usuário informe o caminho da pasta onde ficam os arquivos de minimapa do Tibia. A aplicação deve copiar ou importar todas as imagens encontradas nessa pasta, processá-las, separá-las por andar, organizar as imagens em tiles com base nas coordenadas do jogo e exibir tudo em um visualizador global de mapa.

Além da visualização dos andares separadamente, o sistema também deve permitir desenhar por cima do mapa usando ferramentas básicas, como caneta, setas, linhas, retângulos e círculos. As marcações devem ficar em uma camada separada, sem alterar os arquivos originais do mapa.

Também deve existir um modo chamado **Super Mapa**, capaz de mesclar todos os andares em uma única visualização, com os andares superiores aparecendo sobre os inferiores e as marcações posicionadas corretamente em suas coordenadas globais.

---

# 1. Contexto do Projeto

O Tibia armazena arquivos de minimapa localmente na pasta do jogo. A proposta deste projeto é criar uma aplicação que utilize esses arquivos para montar um visualizador web completo do mapa.

O usuário deve conseguir importar os arquivos locais, visualizar o mapa por andar, navegar pelo mapa, aplicar zoom, criar marcações e exportar tanto mapas individuais quanto uma versão combinada com múltiplos andares.

O sistema deve funcionar como um aplicativo local em `localhost`, com backend em Node.js para acessar os arquivos do computador e frontend em React para exibir e editar o mapa.

---

# 2. Stack Tecnológica Sugerida

## Frontend

* React
* TypeScript
* Vite
* Leaflet.js com `CRS.Simple` para visualização do mapa
* Konva.js ou Fabric.js para camada de desenho
* TailwindCSS ou CSS modular para estilização
* Axios para comunicação com o backend

## Backend

* Node.js
* TypeScript
* Express
* Sharp para processamento e corte de imagens
* fs/path para leitura, cópia e organização dos arquivos locais
* UUID para identificação de marcações

---

# 3. Estrutura Sugerida do Projeto

```txt
tibia-map-editor/
├── backend/
│   ├── src/
│   │   ├── server.ts
│   │   ├── routes/
│   │   │   ├── mapRoutes.ts
│   │   │   ├── tileRoutes.ts
│   │   │   ├── annotationRoutes.ts
│   │   │   ├── projectRoutes.ts
│   │   │   └── exportRoutes.ts
│   │   ├── services/
│   │   │   ├── MapImportService.ts
│   │   │   ├── TileGeneratorService.ts
│   │   │   ├── FloorService.ts
│   │   │   ├── AnnotationService.ts
│   │   │   ├── ProjectService.ts
│   │   │   └── ExportService.ts
│   │   ├── types/
│   │   │   ├── MapTile.ts
│   │   │   ├── Floor.ts
│   │   │   ├── Annotation.ts
│   │   │   └── ProjectConfig.ts
│   │   └── utils/
│   │       ├── fileUtils.ts
│   │       ├── coordinateUtils.ts
│   │       └── tileUtils.ts
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   ├── components/
│   │   │   ├── MapViewer.tsx
│   │   │   ├── FloorSelector.tsx
│   │   │   ├── DrawingToolbar.tsx
│   │   │   ├── LayerPanel.tsx
│   │   │   ├── AnnotationCanvas.tsx
│   │   │   ├── ExportPanel.tsx
│   │   │   └── Sidebar.tsx
│   │   ├── hooks/
│   │   │   ├── useMapTiles.ts
│   │   │   ├── useAnnotations.ts
│   │   │   ├── useDrawingTools.ts
│   │   │   └── useFloors.ts
│   │   ├── services/
│   │   │   ├── api.ts
│   │   │   ├── mapService.ts
│   │   │   ├── annotationService.ts
│   │   │   └── projectService.ts
│   │   ├── types/
│   │   │   ├── MapTile.ts
│   │   │   ├── Annotation.ts
│   │   │   ├── Floor.ts
│   │   │   └── ProjectConfig.ts
│   │   └── styles/
│   │       └── global.css
│   └── package.json
│
├── data/
│   ├── maps/
│   │   ├── original/
│   │   └── imported/
│   ├── tiles/
│   ├── annotations/
│   └── projects/
│
├── README.md
└── PROMPT_COPILOT.md
```

---

# 4. Requisitos Funcionais

## 4.1 Importação dos Mapas

O sistema deve permitir que o usuário informe o caminho da pasta local onde ficam os arquivos de minimapa do Tibia.

Exemplo de caminho no Windows:

```txt
C:/Users/Usuario/AppData/Local/Tibia/packages/Tibia/minimap
```

A aplicação deve:

* localizar todos os arquivos de imagem presentes na pasta;
* copiar os arquivos para uma pasta interna do projeto;
* preservar os arquivos originais sem modificá-los;
* organizar os arquivos importados em uma estrutura própria;
* registrar os metadados dos arquivos importados.

Estrutura desejada:

```txt
/data/maps/original/
/data/maps/imported/
```

---

## 4.2 Processamento das Imagens

Após importar os mapas, o sistema deve processar as imagens e separá-las em tiles.

Cada tile deve representar uma pequena parte do mapa.

Os tiles devem ser organizados por andar.

Estrutura sugerida:

```txt
/data/tiles/{floor}/{tileX}_{tileY}.png
```

ou:

```txt
/data/tiles/{floor}/{zoom}/{x}/{y}.png
```

Cada tile deve possuir metadados como:

```ts
export interface MapTile {
  id: string;
  floor: number;
  x: number;
  y: number;
  tileX: number;
  tileY: number;
  width: number;
  height: number;
  path: string;
}
```

---

## 4.3 Coordenadas do Mapa

O sistema deve usar um sistema de coordenadas cartesiano baseado nas coordenadas do Tibia.

Cada posição no mapa deve ser representada por:

```txt
x = coordenada horizontal
y = coordenada vertical
z = andar
```

O campo `z` representa o andar.

Exemplo:

```txt
x = 32369
y = 32241
z = 7
```

O sistema deve manter consistência entre:

* coordenadas do jogo;
* tiles;
* posição visual no mapa;
* marcações desenhadas;
* exportação de imagem.

---

## 4.4 Visualizador de Mapa

Criar uma interface web com um visualizador de mapa interativo.

O visualizador deve permitir:

* mover o mapa com o mouse;
* aplicar zoom;
* selecionar o andar atual;
* centralizar em uma coordenada específica;
* exibir ou ocultar marcações;
* trocar rapidamente entre andares;
* carregar tiles sob demanda.

O visualizador pode usar Leaflet.js com `CRS.Simple`, pois o mapa do Tibia não usa latitude e longitude.

Exemplo conceitual:

```ts
const map = L.map("map", {
  crs: L.CRS.Simple,
  minZoom: -2,
  maxZoom: 5
});
```

---

## 4.5 Separação por Andares

O usuário deve conseguir selecionar um andar específico.

Exemplo de andares:

```txt
Andar +2
Andar +1
Térreo
Subsolo -1
Subsolo -2
Subsolo -3
```

Internamente, esses andares podem ser representados por valores de `z`.

Exemplo:

```txt
z = 5
z = 6
z = 7
z = 8
z = 9
z = 10
```

Ao trocar de andar, o sistema deve:

* manter a mesma posição X/Y;
* trocar apenas a camada de tiles exibida;
* carregar as marcações correspondentes ao andar selecionado;
* permitir exibir ou ocultar marcações globais.

---

# 5. Ferramentas de Desenho

O sistema deve possuir um editor básico de marcações sobre o mapa.

As ferramentas mínimas são:

* caneta livre;
* linha;
* seta;
* retângulo;
* círculo;
* texto;
* borracha;
* seleção;
* mover marcação;
* apagar marcação individual;
* limpar todas as marcações do andar atual;
* limpar todas as marcações globais.

As marcações devem ficar em uma camada separada do mapa, sem alterar os tiles originais.

---

## 5.1 Modelo de Dados das Marcações

Cada marcação deve possuir uma estrutura semelhante a:

```ts
export type AnnotationType =
  | "freehand"
  | "line"
  | "arrow"
  | "rectangle"
  | "circle"
  | "text";

export interface Annotation {
  id: string;
  type: AnnotationType;
  floor: number | "global";
  points: Array<{ x: number; y: number }>;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  radius?: number;
  color: string;
  strokeWidth: number;
  text?: string;
  opacity?: number;
  createdAt: string;
  updatedAt: string;
}
```

---

## 5.2 Salvamento das Marcações

As marcações devem ser salvas em JSON.

Exemplo de organização:

```txt
/data/annotations/floor-7.json
/data/annotations/floor-8.json
/data/annotations/global.json
```

Exemplo de arquivo:

```json
[
  {
    "id": "uuid",
    "type": "arrow",
    "floor": 7,
    "points": [
      {
        "x": 32369,
        "y": 32241
      },
      {
        "x": 32380,
        "y": 32255
      }
    ],
    "color": "#ff0000",
    "strokeWidth": 3,
    "createdAt": "2026-06-01T00:00:00.000Z",
    "updatedAt": "2026-06-01T00:00:00.000Z"
  }
]
```

---

# 6. Camada de Marcações

As marcações devem ser renderizadas por cima dos tiles do mapa.

Elas devem:

* acompanhar o movimento do mapa;
* acompanhar o zoom;
* manter a posição correta em coordenadas globais;
* ser separadas por andar;
* ter opção de exibir marcações globais;
* não modificar os arquivos originais do mapa.

Quando o usuário trocar de andar, o sistema deve exibir apenas as marcações daquele andar, com opção de mostrar também as marcações globais.

---

# 7. Modo Super Mapa

Implementar uma funcionalidade chamada **Super Mapa** ou **Mapa Global Combinado**.

Nesse modo, o sistema deve gerar uma visualização combinando múltiplos andares.

A ideia é criar uma visualização onde:

* andares inferiores aparecem como base;
* andares superiores aparecem por cima;
* áreas transparentes deixam os andares de baixo visíveis;
* as marcações de todos os andares aparecem na mesma visualização;
* as marcações respeitam a posição global X/Y;
* as marcações não devem se sobrepor de forma desorganizada.

---

## 7.1 Controles do Super Mapa

O modo Super Mapa deve permitir:

* ativar ou desativar andares individuais;
* alterar a opacidade de cada andar;
* escolher quais andares entram na mesclagem;
* destacar o andar selecionado;
* renderizar marcações acima de todos os andares;
* permitir ordem customizada das camadas.

Exemplo de ordem de renderização:

```txt
1. Andares mais baixos
2. Andares intermediários
3. Andares superiores
4. Marcações dos andares
5. Marcações globais
```

---

# 8. Exportação

O sistema deve permitir exportar:

* o andar atual como imagem PNG;
* o Super Mapa combinado como imagem PNG;
* as marcações em JSON;
* o projeto completo contendo tiles, configurações e marcações.

Endpoints sugeridos:

```txt
POST /api/export/floor
POST /api/export/super-map
GET /api/annotations/export
GET /api/project/export
```

---

# 9. Configuração do Projeto

O sistema deve manter um arquivo de configuração do projeto.

Exemplo:

```ts
export interface ProjectConfig {
  projectName: string;
  sourcePath: string;
  tileSize: number;
  floors: number[];
  createdAt: string;
  updatedAt: string;
}
```

Exemplo em JSON:

```json
{
  "projectName": "Meu mapa Tibia",
  "sourcePath": "C:/Users/Usuario/AppData/Local/Tibia/packages/Tibia/minimap",
  "tileSize": 256,
  "floors": [5, 6, 7, 8, 9, 10],
  "createdAt": "2026-06-01T00:00:00.000Z",
  "updatedAt": "2026-06-01T00:00:00.000Z"
}
```

---

# 10. Interface do Usuário

Criar uma interface moderna, simples e escura.

A tela principal deve conter:

* barra lateral esquerda com opções do projeto;
* seletor de andar;
* lista de camadas;
* ferramentas de desenho;
* seletor de cor;
* seletor de espessura da linha;
* botão de importar mapas;
* botão de processar tiles;
* botão de salvar projeto;
* botão de exportar imagem;
* botão de ativar modo Super Mapa.

A área central deve conter o mapa interativo.

A interface deve ser responsiva, mas o foco principal deve ser desktop.

---

# 11. API do Backend

Criar endpoints semelhantes a:

```txt
POST /api/maps/import
GET /api/maps/floors
POST /api/tiles/generate
GET /api/tiles/:floor/:z/:x/:y
GET /api/annotations/:floor
POST /api/annotations/:floor
DELETE /api/annotations/:floor/:id
GET /api/project
POST /api/project/save
POST /api/export/floor
POST /api/export/super-map
```

---

## 11.1 Importação de Mapas

```txt
POST /api/maps/import
```

Body esperado:

```json
{
  "sourcePath": "C:/Users/Usuario/AppData/Local/Tibia/packages/Tibia/minimap"
}
```

Resposta esperada:

```json
{
  "success": true,
  "importedFiles": 1200,
  "message": "Mapas importados com sucesso."
}
```

---

## 11.2 Listar Andares

```txt
GET /api/maps/floors
```

Resposta esperada:

```json
{
  "floors": [5, 6, 7, 8, 9, 10, 11]
}
```

---

## 11.3 Gerar Tiles

```txt
POST /api/tiles/generate
```

Body esperado:

```json
{
  "tileSize": 256
}
```

Resposta esperada:

```json
{
  "success": true,
  "generatedTiles": 4500
}
```

---

## 11.4 Buscar Marcações

```txt
GET /api/annotations/:floor
```

Resposta esperada:

```json
[
  {
    "id": "uuid",
    "type": "rectangle",
    "floor": 7,
    "x": 32369,
    "y": 32241,
    "width": 50,
    "height": 30,
    "color": "#ff0000",
    "strokeWidth": 3,
    "createdAt": "2026-06-01T00:00:00.000Z",
    "updatedAt": "2026-06-01T00:00:00.000Z"
  }
]
```

---

## 11.5 Salvar Marcações

```txt
POST /api/annotations/:floor
```

Body esperado:

```json
[
  {
    "id": "uuid",
    "type": "line",
    "floor": 7,
    "points": [
      {
        "x": 32369,
        "y": 32241
      },
      {
        "x": 32390,
        "y": 32260
      }
    ],
    "color": "#00ff00",
    "strokeWidth": 4,
    "createdAt": "2026-06-01T00:00:00.000Z",
    "updatedAt": "2026-06-01T00:00:00.000Z"
  }
]
```

---

# 12. Requisitos Técnicos Importantes

O sistema deve ser pensado para lidar com muitos arquivos de imagem.

Portanto:

* não carregar todas as imagens de uma vez no frontend;
* usar tiles sob demanda;
* manter as marcações em uma camada separada;
* manter os metadados das coordenadas;
* evitar alterar os arquivos originais do Tibia;
* separar responsabilidades entre backend e frontend;
* usar TypeScript com tipos bem definidos;
* evitar implementar tudo em um único arquivo.

---

# 13. Versão Mínima Funcional

A primeira versão funcional deve conter:

* importação de imagens da pasta informada;
* cópia das imagens para a pasta interna do projeto;
* geração básica de tiles;
* visualização de tiles por andar;
* seletor de andar;
* mapa com zoom e movimentação;
* camada de desenho;
* ferramentas de caneta, linha, retângulo, círculo e seta;
* salvamento das marcações em JSON;
* carregamento das marcações ao abrir o projeto;
* modo básico de Super Mapa;
* controle de opacidade por andar;
* exportação do mapa atual como PNG.

---

# 14. Observações de Implementação

Como navegadores não conseguem acessar livremente qualquer pasta do computador sem interação do usuário, o projeto deve ser tratado como um app local com backend Node.js.

O frontend roda no navegador, mas quem acessa a pasta local do Tibia é o backend.

No futuro, esse projeto pode ser adaptado para Electron ou Tauri, transformando o sistema em um aplicativo desktop.

---

# 15. Prompt para o GitHub Copilot

Leia esta especificação e implemente a estrutura inicial do projeto `tibia-map-editor`.

Crie backend e frontend separados, usando Node.js/Express/TypeScript no backend e React/Vite/TypeScript no frontend.

Priorize uma versão mínima funcional.

Não implemente tudo em um único arquivo.

Separe o código em:

* rotas;
* serviços;
* tipos;
* componentes;
* hooks;
* utilitários.

Implemente primeiro:

1. estrutura de pastas;
2. configuração inicial do backend;
3. configuração inicial do frontend;
4. tipos principais;
5. endpoints básicos;
6. componentes principais da interface;
7. importação de mapas;
8. geração simples de tiles;
9. visualizador inicial com seletor de andar;
10. camada inicial de desenho.

Use código limpo, organizado e comentado nos pontos mais complexos, principalmente:

* cálculo de coordenadas;
* geração de tiles;
* troca de andares;
* renderização das marcações;
* mesclagem dos andares no modo Super Mapa.

Ao finalizar, inclua instruções no `README.md` explicando como instalar, rodar o backend, rodar o frontend e testar a aplicação localmente.
