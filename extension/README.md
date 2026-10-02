# AutoCompare Multi-Marketplace (5 Slots) - Extensão Chrome Manifest V3

Extensão oficial para Google Chrome projetada para capturar e comparar simultaneamente até 5 anúncios de e-commerce (qualquer combinação de **Shopee** e **AliExpress**), gerando matriz financeira multi-coluna e alinhamento canónico de especificações técnicas chave a chave.

---

## 🚀 Como Instalar no Google Chrome (Modo Desenvolvedor)

1. Abra o Google Chrome e digite na barra de endereços: `chrome://extensions/`
2. No canto superior direito, ative a chave **"Modo do desenvolvedor"** (Developer Mode).
3. Clique no botão **"Carregar sem compactação"** (Load unpacked).
4. Selecione a pasta `extension/` deste projeto.
5. Pronto! O ícone do **AutoCompare** aparecerá na barra de extensões do Chrome.

---

## ⚡ Como Usar o SidePanel Multi-Abas (Até 5 Slots)

1. Abra uma aba de produto na **Shopee** (`shopee.com.br`) ou no **AliExpress** (`aliexpress.com`).
2. Abra o **Painel Lateral (Side Panel)** do Chrome e selecione o **AutoCompare Multi-Marketplace**.
3. Clique em **"Capturar Aba Atual para o Slot Livre"** (ou escolha diretamente os botões **Slot 1 a Slot 5**).
4. Abra outras abas com os produtos concorrentes e repita a captura nos slots subsequentes.
5. Visualize instantaneamente:
   - **Matriz Financeira Multi-Coluna:** Destaque em verde do menor preço total e percentual de diferença dos demais.
   - **Matriz de Especificações Canónicas:** Normalização de atributos (Bateria, Conectividade, Potência, Dimensões, ANC, etc.) com destaque de disparidades.
   - **Veredito Executivo de Compra e Exportação:** Botão para copiar o relatório completo para a área de transferência.

---

## 📁 Estrutura dos Arquivos

- `manifest.json`: Configuração Manifest V3 com Side Panel e permissões de abas/armazenamento.
- `content.js`: Script de injeção e seletores DOM atualizados para Shopee e AliExpress.
- `background.js`: Service Worker que controla a abertura do Side Panel e armazenamento.
- `sidepanel.html`: Interface visual do painel lateral.
- `sidepanel.js`: Motor de normalização, gestão dos 5 slots no `chrome.storage.local` e geração da matriz.
- `styles.css`: Estilos modernos com suporte a tema escuro e visualização multi-coluna.
