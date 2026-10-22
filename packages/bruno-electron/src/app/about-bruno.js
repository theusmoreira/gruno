module.exports = function aboutBruno({ version }) {
  const currentYear = new Date().getFullYear();
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, minimum-scale=1.0, initial-scale=1, user-scalable=yes">
        <title>About Gruno</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                text-align: center;
                margin: 0;
                padding: 10px;
                background-color: #f4f4f4;
                color: #333;
            }
            .logo {
                margin-top: 0px;
            }
            .title {
                font-size: 24px;
                margin-top: 5px;
                font-weight: bold;
                color: #222;
            }
            .description {
                font-size: 12px;
                color: #222;
                margin-top: 5px;
            }
            .buttons {
                margin-top: 5px;
            }
            .footer {
                margin-top: 5px;
                padding: 5px;
                font-size: 14px;
                color: #555;
            }
            .link {
                display: inline-block;
                margin-top: 10px;
                padding: 10px 15px;
                background-color: #5B4BE0;
                color: white;
                text-decoration: none;
                border-radius: 5px;
                cursor: pointer;
                transition: background 0.3s;
            }
            .link:hover {
                background-color: #5B4BE0;
            }
        </style>
    </head>
    <body>
      <div class="logo">
      </div>
        <svg width="100" viewBox="180 220 664 664" xmlns="http://www.w3.org/2000/svg">
          <polygon points="402,330 236,300 196,560 300,640" fill="#B86F45"/>
          <polygon points="236,300 196,560 250,520" fill="#9A5534"/>
          <polygon points="622,330 788,300 828,560 724,640" fill="#B86F45"/>
          <polygon points="788,300 828,560 774,520" fill="#9A5534"/>
          <polygon points="402,316 622,316 744,420 760,600 690,740 512,800 334,740 264,600 280,420" fill="#F6ECE0"/>
          <polygon points="280,420 264,600 404,560" fill="#ECDCC9"/>
          <polygon points="744,420 760,600 620,560" fill="#ECDCC9"/>
          <polygon points="264,600 334,740 404,640" fill="#E3CDB4"/>
          <polygon points="760,600 690,740 620,640" fill="#E3CDB4"/>
          <polygon points="464,316 560,316 512,520" fill="#B86F45"/>
          <path d="M512 540 L640 620 L620 730 L512 790 L404 730 L384 620 Z" fill="#FFFFFF"/>
          <circle cx="404" cy="508" r="32" fill="#1E1B4B"/>
          <circle cx="620" cy="508" r="32" fill="#1E1B4B"/>
          <circle cx="414" cy="497" r="10" fill="#FFFFFF"/>
          <circle cx="630" cy="497" r="10" fill="#FFFFFF"/>
          <path d="M462 604 L562 604 L512 656 Z" fill="#1E1B4B" stroke="#1E1B4B" stroke-width="22" stroke-linejoin="round"/>
          <path d="M512 662 L512 700 M512 700 Q480 728 452 704 M512 700 Q544 728 572 704" fill="none" stroke="#1E1B4B" stroke-width="14" stroke-linecap="round"/>
          <path d="M490 712 L534 712 L534 744 Q512 772 490 744 Z" fill="#F06A7A"/>
        </svg>
      <h2 class="title">Gruno ${version}</h2>
      <footer class="footer">
          ©${currentYear} Gruno contributors
      </footer>
    </body>
    </html>
  `;
};
