import * as SNS from "@solana/spl-name-service";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
var parseArgs = require('minimist');
const fs = require('fs');
const readline = require('readline');

export const SOL_TLD_AUTHORITY = new PublicKey(
    "58PwtjSDuFHuUkYjH9BYnnQKHfwo9reZhC2zMJv9JPkx"
  );

export const RPC_PROVIDER = "https://ssc-dao.genesysgo.net/";

async function readLines(fileName : string) : Promise<string[]> {
    const fileStream = fs.createReadStream(fileName);
  
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    const lines : string[] = [];
  
    for await (const line of rl) {
      // Each line in input.txt will be successively available here as `line`.
      lines.push(line);
    }
    return lines;
  }

  async function writeLines(fileName: string, lines: string[]) {
    var logger = fs.createWriteStream(fileName, {
        flags: 'a' 
      });
      
      for(const line of lines){
        logger.write(line+ "\n");
      }
  }

async function isDomainAvailable(domainName : string, connection: Connection, 
        verbose = false): Promise<boolean>{
    const hashed = await SNS.getHashedName(domainName.toLowerCase());
    const accountPK = await SNS.getNameAccountKey(hashed, undefined,
    SOL_TLD_AUTHORITY);
    
    const accountInfo = await connection.getAccountInfo(accountPK);
    const accountExists : boolean = accountInfo ? true : false;
    if(!accountExists){
        const txs = await connection.getSignaturesForAddress(accountPK);
        if(txs.length>0){
            if(verbose){
                console.log(domainName+" unclaimed but probably not available!");
            }
            return false;
        }
    }
    if(verbose) {
        if(accountExists){
            console.log(domainName+" already claimed!");
        } else {
            console.log(domainName+" available!");
        }
        console.log(accountPK.toBase58());
    }
    if(!accountExists)
    console.log(accountPK.toBase58());
    return !accountExists;
}

async function main(){
    const args = parseArgs(process.argv.slice(2));

    const connection = new Connection(RPC_PROVIDER);

    if(args["name"]){
        await isDomainAvailable(args["name"], connection, true);
    }
    
    
    if(args["list"]){
        const domainNames = await readLines(args["list"]);
        const availableDomains = [];
        console.log("available domains:");
        for (const domain of domainNames){
            const available = await isDomainAvailable(domain, connection);
            if(available){
                availableDomains.push(domain);
                console.log(domain);
            }
        }
        if(args["outfile"]){
            writeLines(args["outfile"], availableDomains)
        }
    }
}
  
  
if (require.main === module) {
    main();
}