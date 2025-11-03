
import * as admin from 'firebase-admin';

let adminApp: admin.app.App;

export function getAdminApp() {
  if (!adminApp) {
    if (admin.apps.length > 0) {
      adminApp = admin.apps[0]!;
    } else {
      // Direct use of service account credentials to bypass environment variable parsing issues.
      const serviceAccount: admin.ServiceAccount = {
        projectId: "studio-1673338771-20d22",
        clientEmail: "firebase-adminsdk-fbsvc@studio-1673338771-20d22.iam.gserviceaccount.com",
        privateKey: "-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCeY7bSHktFsRcG\njUBn95TqAxzSkIP4gn/YjFshxb76IXTjVaS77g+uIE9AKOXuEz0PfTyNSPgsSBGk\nJhhGr5EO0Gj2kbrND4pHqZbJGeDbKmTpFku/JAxRXiU0E+P/AGNlN5WAhERoDETU\n7JOR7rp2nEggubFRFYOf7AOVlv/qXx7DpaMkXSmM26t0v+EUKHLR8ka2pOygeFfg\nUWYBlP1XQXDGN2l+9GH55RlYqnRWpKShqJ4h2of2VqlKJf1pCNJImAjxNV4WfUtI\nNdq/HHH12mwmcdN6ydREyclL8OS1Q1QTZetjSywK9d3OqQQ9VRdck7QXb78dNpY2\ntMTfOJRJAgMBAAECggEAB/wLwOGuhNioWEY1TE+MYZQUXlSaQMCjZF933RGJzt8c\n5gnUVa7AJPEFW/X69OjT0Ly+0kFnqkA/02rMp9OSX1gkfR0jI5nqD8CMMSzfPTRJ\nr8dHvHs7LYNZPv+AzxiHBqb/WNPgWn2JLW4+yjPbyhPQIbDeTJU7goutTiLDrwir\nUPdsDA1i6/k9a5L1/3Fa1Cl7OCQdMIztQrV+gWjk6lf6TmJCNYDQX8Ma2/09gTYV\nDPLHK79zgVtTk6Ly9YOwaAiXoy3Gi5ifULh/TG2eqaD3cqNAIruVIItl5cQknqjI\naDviQLaEKM84mdrMNlqj3fxFrTGU+3XgqSHh1zBhOQKBgQDStU0Bkx1wR0EVOde5\nKJAgyZezti7Hbiz06LjUtvlr0x3lawoS64Wi61udOHca/u1NlGz82DktB1T6Cnsb\ndvsmScdA1prHufLiwRzsF2qlqsXuVZL2PMw4ywaPSiSYoRmAo2h3as8SoJkeJ2Bf\nLMVL27IYt9jdresJAjPQL1ffZwKBgQDAb3UwN/5ImojLaMRSOzukYOf1Y1FZBuAf\n7RFweF8e3CWGoJQ2V7A04OlmbkPvnYVdztN6atC/wlgSEJVhkuaXD5iNMnJMWYpE\n0GW/Cm2PMDq4mVXx6Brs7jX1kr9RfgouI5mGn+aIiFH/b8ffkqgb1bo30W6o6LGZ\n67om5teQzwKBgFQ7hBBIFnGnGn54xCNR8uQYktuVzfeNtM0nJ5RpnSYcnIv1EW7k\n1mR9v/8G7p5NIOJtnnAppBm7H55hiDs/gkEZJ11lLTUAwfciCgTbi5e0wDF55ikn\nvuBJUVMA6cZWSJKjQITUnvksWGm0hhMmG60qo3S8MibUeuv8BGiKNI+rAoGAEWUB\nzs4A6kctvlVGCbjY907bKM9Fdyqr77baMLRwxLVZnwW83/ylLOJ3to6ZDXvLpmMf\nsp0dKXhDxb5CAoPo3BbIz1qUAlrFqNq9l7s1lA/j/vO9VRSJ+oi9z+jn6lHeUbVe\nF1E04XqRDunnw0nacEmtf4Yq3pHKHAO22/VZ3vkCgYBXeSGaw/Vu7RMEkxUzwOA1\nd/Tovgc/0NQTVQJA0eRU2417+aLQH+SBjp9vS6iJ3xAVvBh8JCJVLOh9ubgmQhy9\nNvMnTKzywangECAsY865cB+nd0MhfjCqWUp7fBISn3yiZNn7BusuxXsEgpmHn8MV\npT21elDyNe8QfvXqmc6UKg==\n-----END PRIVATE KEY-----\n",
      };

      adminApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    }
  }
  return adminApp;
}

    