const nodemailer = require('nodemailer');

const sendLibraryCardEmail = async (user, imageBuffer) => {
    // Validate environment variables
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        throw new Error('Email credentials are not configured in .env file');
    }

    // Configure the email transporter for Gmail with proper settings
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        },
        tls: {
            rejectUnauthorized: false
        }
    });

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: process.env.ADMIN_EMAIL, // Send to designated admin
        cc: user.email,              // Optional: Send a copy to the user
        subject: `New Library Card Generated: ${user.name}`,
        text: `Hello, a new library card has been generated for ${user.name}.\n\nPlease find the attached JPEG card.`,
        attachments: [
            {
                filename: `${user.name.replace(/\s+/g, '_')}_LibraryCard.jpg`,
                content: imageBuffer,
                contentType: 'image/jpeg'
            }
        ]
    };

    try {
        // Test the connection first
        await transporter.verify();
        console.log('SMTP server connection successful');

        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent successfully:', info.response);
        return info;
    } catch (emailError) {
        console.error('Email sending failed:', emailError.message);
        console.error('Full error details:', emailError);

        // Provide more specific error messages
        if (emailError.code === 'EAUTH') {
            throw new Error('Email authentication failed. Please check your Gmail credentials and ensure you have an App Password if 2FA is enabled.');
        } else if (emailError.code === 'ECONNREFUSED') {
            throw new Error('Email server connection refused. Check your internet connection and Gmail SMTP settings.');
        } else if (emailError.code === 'ETIMEDOUT') {
            throw new Error('Email server connection timed out. This may be due to network issues or Gmail blocking the connection.');
        } else {
            throw new Error(`Failed to send email: ${emailError.message}`);
        }
    }
};

module.exports = { sendLibraryCardEmail };
