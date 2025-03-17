import fs from "fs";
import Axios from "axios";
import { HttpsProxyAgent } from "https-proxy-agent";
import { SocksProxyAgent } from "socks-proxy-agent";

/** Functions */
import { prompt } from "./utils/prompt";
import { logger } from "./utils/logger";
import { sleep } from "./utils/sleep";

const files = {
    proxies: "data/proxies.txt",
    targeturl: "data/targetUrl.txt",
    timeout: "data/timeout.txt",
    validProxies: "data/validProxies.txt"
};

(async() => {
    while (true) {
        console.clear();
        if (!fs.existsSync(files.timeout)) {
            logger.error(`${files.timeout} does not exists.`);
            try {
                fs.writeFileSync(files.timeout, "3000", "utf-8");
            } catch (_) {
                logger.error(`Failed to create ${files.timeout}`);
                await sleep(6000);
                process.exit(0);
            }
            logger.info(`Created ${files.timeout}, initial timeout value: 3000ms`);
        }

        const timeout = Number(fs.readFileSync(files.timeout, "utf-8"));
        if (!(timeout > 0)) {
            logger.error("The timeout value must be greater than 0.");
            fs.writeFileSync(files.timeout, "3000", "utf-8");
            logger.info("Set complated, initial timeout value: 3000ms");
        }

        if (!fs.existsSync(files.targeturl)) {
            logger.error(`${files.targeturl} does not exists.`);
            try {
                fs.writeFileSync(files.targeturl, "https://example.com", "utf-8");
            } catch (_) {
                logger.error(`Failed to create ${files.targeturl}`);
                await sleep(6000);
                process.exit(0);
            }
            logger.info(`Created ${files.targeturl}, initial targetUrl: https://example.com`);
        }

        const targetUrl = fs.readFileSync(files.targeturl, "utf-8");
        if (!targetUrl.startsWith("https://")) {
            logger.error("The URL is invalid.");
            fs.writeFileSync(files.targeturl, "https://example.com", "utf-8");
            logger.info("Set complated.");
        }

        if (!fs.existsSync(files.validProxies)) {
            logger.error(`${files.validProxies} does not exists.`);
            try {
                fs.writeFileSync(files.validProxies, "", "utf-8");
                logger.info(`Created ${files.validProxies}`);
            } catch (_) {
                logger.error(`Failed to create ${files.validProxies}`);
                await sleep(6000);
                process.exit(0);
            }
        }

        if (!fs.existsSync(files.proxies)) {
            logger.error(`${files.proxies} does not exists.`);
            try {
                fs.writeFileSync(files.proxies, "", "utf-8");
                logger.info(`Created ${files.proxies}`);
            } catch (_) {
                logger.error(`Failed to create ${files.proxies}`);
                await sleep(6000);
                process.exit(0);
            }
            await sleep(6000);
            process.exit(0);
        }

        const proxies = fs.readFileSync(files.proxies, "utf-8")
        .split("\n")
        .map(line => line.trim())
        .filter(line => 
        line.startsWith("http://")  ||
        line.startsWith("socks://")
        );

        if (proxies.length === 0) {
            logger.info(`${files.proxies} is empty.`);
            await sleep(6000);
            process.exit(0);
        }

        console.log(`
╔═╗╦═╗╔═╗═╗ ╦╦ ╦  ╔═╗╦ ╦╔═╗╔═╗╦╔═╔═╗╦═╗
╠═╝╠╦╝║ ║╔╩╦╝╚╦╝  ║  ╠═╣║╣ ║  ╠╩╗║╣ ╠╦╝
╩  ╩╚═╚═╝╩ ╚═ ╩   ╚═╝╩ ╩╚═╝╚═╝╩ ╩╚═╝╩╚═
validProxies: ${proxies.length}
╭──────────────────────────────────────╮
│ 1: Proxy checker                     │
│ 2: Set timeout                       │
│ 3: Set target URL                    │
│ exit                                 │
╰──────────────────────────────────────╯
`);

        const select = await prompt("select");
        switch (select) {
            case "exit":
                logger.info("Exit after 3 seconds...");
                await sleep(3000);
                process.exit(0);

            case "1":
                for (const proxy of proxies) {
                    try {
                        const res = await Axios({
                            method: "GET",
                            url: targetUrl,
                            timeout: timeout,
                            httpsAgent: true
                            ? (proxy.startsWith("http://")
                            ? new HttpsProxyAgent(proxy)
                            : (proxy.startsWith("socks://")
                            ? new SocksProxyAgent(proxy)
                            : undefined))
                            : undefined
                        });
                        if (res.status !== 200) {
                            return logger.error(`${proxy} is invalid.`);
                        }
                        logger.success(`${proxy} is valid.`);
                        fs.appendFileSync(files.validProxies, `${proxy}\n`, "utf-8");
                    } catch (e) {
                        if (e instanceof Error) {
                            return logger.error(`${proxy} Error: ${e.message}`);
                        }
                    } finally {
                        continue;
                    }
                }
            break;

            case "2":
                const setTimeout = Number(await prompt("ms"));
                if (isNaN(setTimeout)) {
                    return logger.error(`${setTimeout} is not a number.`);
                }
                if (!(setTimeout > 0)) {
                    return logger.error("The timeout value must be greater than 0.");
                }
                fs.writeFileSync(files.timeout, `${setTimeout}`, "utf-8");
                logger.info("Set complated.");
            break;

            case "3":
                const setTargetUrl = await prompt("targetUrl");
                if (!setTargetUrl.startsWith("https://")) {
                    return logger.error("The URL is invalid.");
                }
                fs.writeFileSync(files.targeturl, setTargetUrl, "utf-8");
                logger.info("Set complated.");
            break;

            default:
                logger.error("It doesn't exist in the options.");
            break;
        }
        await sleep(6000);
        continue;
    }
})();