"""Send notification email to Zakariae Chelle.

Usage:
    python scripts/send_mail.py [--to EMAIL] [--subject SUBJECT] [--body BODY]
"""
from __future__ import annotations

import argparse
import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

DEFAULT_RECIPIENT = "zakariaechelle2001@gmail.com"
DEFAULT_SUBJECT = "✅ Stage Radar: Repository pushed & CI verified"
DEFAULT_BODY = """Bonjour Zakariae,

Le projet Stage Radar a été configuré et synchronisé avec succès sur votre dépôt GitHub :
🔗 https://github.com/ZAKARIAE48CHELLE/stage-radar

Résumé des vérifications :
1. Code source et fixtures : Intègres (11 tests unitaires passés avec succès).
2. CI GitHub Actions : Workflow automatisé (.github/workflows/ci.yml et daily-scrape.yml).
3. GitHub Pages : Structure docs/ et .nojekyll prêts pour le déploiement sur :
   https://zakariae48chelle.github.io/stage-radar/
4. Détection stages rémunérés ("RÉMUNÉRÉ") et indicateurs de source intégrés.

Cordialement,
Stage Radar Bot
"""


def send_mail(to_addr: str, subject: str, body: str) -> bool:
    user = os.getenv("SMTP_USER")
    pwd = os.getenv("SMTP_PASS")
    host = os.getenv("SMTP_HOST", "smtp.gmail.com")
    port = int(os.getenv("SMTP_PORT", "587"))

    if not (user and pwd):
        print(f"[!] Identifiants SMTP absents (variables SMTP_USER et SMTP_PASS non définies).")
        print(f"[i] Pour activer l'envoi d'e-mails Gmail :")
        print(f"    1. Activez l'authentification en 2 étapes sur votre compte Google.")
        print(f"    2. Générez un 'Mot de passe d'application' (Sécurité > Mots de passe d'application).")
        print(f"    3. Définissez les variables d'environnement :")
        print(f"       $env:SMTP_USER = '{to_addr}'")
        print(f"       $env:SMTP_PASS = '<votre_mot_de_passe_d_application>'")
        print(f"       python scripts/send_mail.py")
        return False

    msg = MIMEMultipart()
    msg["Subject"] = subject
    msg["From"] = f"Stage Radar <{user}>"
    msg["To"] = to_addr
    msg.attach(MIMEText(body, "plain", "utf-8"))

    try:
        with smtplib.SMTP(host, port, timeout=20) as server:
            server.ehlo()
            server.starttls()
            server.ehlo()
            server.login(user, pwd)
            server.send_message(msg)
        print(f"[+] E-mail envoyé avec succès à {to_addr}")
        return True
    except Exception as e:
        print(f"[-] Erreur lors de l'envoi de l'e-mail : {e}")
        return False


def main():
    parser = argparse.ArgumentParser(description="Envoyer un e-mail de notification Stage Radar")
    parser.add_argument("--to", default=DEFAULT_RECIPIENT, help="Adresse destinataire")
    parser.add_argument("--subject", default=DEFAULT_SUBJECT, help="Objet du mail")
    parser.add_argument("--body", default=DEFAULT_BODY, help="Corps du message")
    args = parser.parse_args()

    send_mail(args.to, args.subject, args.body)


if __name__ == "__main__":
    main()
