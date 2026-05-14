import nodemailer from 'nodemailer';

type FileConfig = {
    emailFrom?: string;
    smtpOptions?: any;
};

const fileConfig: FileConfig =
    process.env.NODE_ENV === 'production' ? {} : require('../config.json');

function getSmtpOptions() {
    if (process.env.NODE_ENV === 'production' && !process.env.SMTP_HOST) {
        throw 'SMTP_HOST environment variable is required in production to send emails';
    }

    if (process.env.SMTP_HOST) {
        return {
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587,
            secure: process.env.SMTP_SECURE === 'true',
            auth: process.env.SMTP_USER && process.env.SMTP_PASS
                ? {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS
                }
                : undefined
        };
    }

    if (!fileConfig.smtpOptions) throw 'SMTP configuration is missing';

    return fileConfig.smtpOptions;
}

function getEmailFrom() {
    return process.env.EMAIL_FROM || fileConfig.emailFrom;
}

async function sendWithResend({ to, subject, html, from }: any) {
    const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            from: from || getEmailFrom(),
            to: Array.isArray(to) ? to : [to],
            subject,
            html
        })
    });

    if (!response.ok) {
        const error = await response.text();
        throw `Resend email failed: ${error}`;
    }
}

export default async function sendEmail({ to, subject, html, from = getEmailFrom() }: any) {
    if (!from) throw 'EMAIL_FROM is missing';

    const hasResend = !!process.env.RESEND_API_KEY;

    if (hasResend) {
        return await sendWithResend({ to, subject, html, from });
    }

    const transporter = nodemailer.createTransport(getSmtpOptions());
    await transporter.sendMail({ from, to, subject, html });
}