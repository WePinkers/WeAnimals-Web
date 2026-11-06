# WeAnimals-Web

Painel web institucional da plataforma WeAnimals para ONGs, abrigos e administradores.

O portal permite acompanhar denúncias, gerenciar animais para adoção, analisar candidaturas, acompanhar check-ins pós-adoção e interagir com a comunidade sincronizada com o aplicativo Android.

## Integrantes do Grupo

| RA | Nome completo |
| --- | --- |
| 823115360 | Alissa Novais Wenceslau Ferreira |
| 823115679 | Carolina Ornelas de Almeida |
| 823113068 | Mayara Borges de Carvalho |
| 823119535 | Támer Issa Ubaid |
| 824152542 | Felipe Menegazzi Garofalo |

## Tecnologias Utilizadas

- React
- TypeScript
- Vite
- Firebase Authentication
- Cloud Firestore
- GitHub Pages
- GitHub Actions

## Funcionalidades

- Login institucional por CNPJ ou e-mail
- Acesso separado para ONG/Abrigo e administradores
- Recuperação de senha por e-mail
- Solicitação de credenciamento institucional
- Painel da ONG/Abrigo
- Painel administrativo
- Acompanhamento de denúncias e atualização de status
- Chat entre ONG/Abrigo e denunciante
- Cadastro e gerenciamento de animais
- Candidaturas de adoção
- Conversas com interessados em adoção
- Check-ins pós-adoção
- Comunidade com publicações e campanhas
- Comentários, curtidas e menções
- Sincronização de dados com o aplicativo Android

## Contas de demonstração

As contas abaixo são destinadas exclusivamente à apresentação e avaliação do projeto. Não utilize estas credenciais em produção e não reutilize as senhas em outros serviços.

### ONG/Abrigo

```text
CNPJ: 62.075.431/0001-74
Senha: 123456789
```

### Administradores

```text
E-mails:
alissa.novais@weanimals.com.br
carol.ornelas@weanimals.com.br
mayara.borges@weanimals.com.br
tamer.issa@weanimals.com.br
felipe.menegazzi@weanimals.com.br

Senha de demonstração: 12345678
```

> Como este repositório pode ser público, estas credenciais ficam visíveis para qualquer pessoa. Elas devem permanecer limitadas a contas fictícias de teste, sem dados reais ou permissões de produção.

## Desenvolvimento local

Instale as dependências:

```bash
npm install
```

Configure o arquivo `.env.local` com as variáveis do Firebase:

```env
VITE_FIREBASE_API_KEY=SUA_CHAVE
VITE_FIREBASE_AUTH_DOMAIN=SEU_DOMINIO.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=SEU_PROJETO
VITE_FIREBASE_STORAGE_BUCKET=SEU_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID=SEU_SENDER_ID
VITE_FIREBASE_APP_ID=SEU_APP_ID
```

Inicie o servidor de desenvolvimento:

```bash
npm run dev
```

O site estará disponível em `http://localhost:5173/`.

## Build

Para gerar a versão de produção:

```bash
npm run build
```

Para visualizar a build localmente:

```bash
npm run preview
```

## Publicação

O deploy é feito pelo GitHub Actions após alterações na branch `main`.

Site publicado:

```text
https://wepinkers.github.io/WeAnimals-Web/
```

As variáveis do Firebase utilizadas no build publicado ficam configuradas nas variáveis do repositório em **Settings → Secrets and variables → Actions → Variables**.

## Projeto acadêmico

O WeAnimals-Web faz parte do projeto de TCC desenvolvido em equipe para apoiar a proteção e o bem-estar animal por meio de uma plataforma integrada entre aplicativo Android, ONGs, abrigos e administradores.
