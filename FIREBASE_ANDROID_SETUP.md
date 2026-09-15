# EvoluaFit I.A. - Firebase + APK Android

A branch `feature/firebase-android-apk` prepara o app para Android com Capacitor 8 e troca a camada de nuvem do Supabase por Firebase Authentication + Cloud Firestore.

## 1. Criar o projeto Firebase

1. Abra o Firebase Console e crie um projeto.
2. Em **Authentication > Sign-in method**, ative **E-mail/senha**.
3. Em **Firestore Database**, crie o banco.
4. Em **Configurações do projeto > Seus apps**, registre um app Web.
5. Copie o objeto `firebaseConfig`.

## 2. Configurar o app

Há duas opções.

### Opção A - configurar no código

Edite `firebase-config.js` e substitua os campos vazios pelo objeto fornecido pelo Firebase.

### Opção B - configurar só no APK gerado pelo GitHub Actions

Crie no repositório um secret chamado `FIREBASE_WEB_CONFIG` contendo somente o JSON do objeto de configuração, por exemplo:

```json
{
  "apiKey": "...",
  "authDomain": "...",
  "projectId": "...",
  "storageBucket": "...",
  "messagingSenderId": "...",
  "appId": "..."
}
```

O workflow injeta esse conteúdo em `firebase-config.js` durante a compilação.

## 3. Publicar as regras do Firestore

Use o conteúdo de `firestore.rules` nas regras do banco. Cada usuário autenticado só pode ler e alterar o próprio documento em `usuarios/{uid}`.

## 4. Gerar APK automaticamente

O workflow `.github/workflows/build-android-apk.yml` gera um APK de teste instalável.

Ele usa:

- Node.js 22
- Java 21
- Capacitor 8
- Gradle do projeto Android gerado pelo Capacitor

O APK final aparece nos artefatos do workflow com o nome `EvoluaFit-debug-apk`.

## 5. Gerar localmente no Windows

```powershell
npm install
npm run android:add
npm run android:open
```

Depois, no Android Studio, use **Build > Build APK(s)**.

Nas próximas alterações web, use:

```powershell
npm run android:sync
npm run android:open
```

## Sincronização de dados

O Firebase salva as mesmas chaves principais já utilizadas pelo app:

- histórico de peso
- alimentação
- treinos
- saúde
- altura
- meta de peso e calorias
- perfil
- tema
- cache da IA
- lembretes da Luma

Quando existe backup na nuvem e também dados no aparelho, o app não sobrescreve automaticamente. Ele pede para escolher entre **Salvar na nuvem** e **Restaurar da nuvem**.
