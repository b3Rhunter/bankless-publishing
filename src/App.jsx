import { Button, Col, Menu, Row, notification } from "antd";
import "antd/dist/antd.css";
import {
  useBalance,
  useContractLoader,
  useContractReader,
  useGasPrice,
  useOnBlock,
  useUserProviderAndSigner,
} from "eth-hooks";
import { useExchangeEthPrice } from "eth-hooks/dapps/dex";
import React, { useCallback, useEffect, useState } from "react";
import { Link, Route, Switch, useLocation } from "react-router-dom";
import "./App.css";
import { Account, Contract, Header, NetworkDisplay, FaucetHint, NetworkSwitch} from "./components";
import { NETWORKS, INFURA_ID } from "./constants";
import externalContracts from "./contracts/external_contracts";
// contracts
import deployedContracts from "./contracts/hardhat_contracts.json";
import { Transactor, Web3ModalSetup } from "./helpers";
import { Home, ExampleUI, Hints, Subgraph } from "./views";
import { useStaticJsonRPC } from "./hooks";

import sanityClient from "./client.js";
import Logo from "./images/bp_logo_512.png";
import "./myCss.css";
import OnePost from "./OnePost";
import AllPosts from "./AllPosts";
import imageUrlBuilder from "@sanity/image-url";
import MailchimpSubscribe from "react-mailchimp-subscribe";


const CustomForm = ({ status, message, onValidated }) => {

  const sendNotification = (type, data) => {
    return notification[type]({
      ...data,
      placement: "bottomRight",
    });
  };

  let email;
  const submit = () =>
    email &&
    email.value.indexOf("@") > -1 &&
    onValidated({
      EMAIL: email.value
    });

    return (
      <div>
     
        {status === "success" && 
                sendNotification("success", {
                  message: "Subscribed!",
                  description: `Thank you for subscribing to Good Morning News`,
                })
        }
        <input
          style={{ fontSize: "1em", padding: 5, borderRadius: "5px", backgroundColor: "rgba(255,255,255,0.1)", marginRight: "5px" }}
          ref={node => (email = node)}
          type="email"
          placeholder="email"
        />

        <button className="sub-btn" style={{ fontSize: "1em", padding: 5, marginTop: "10px", border: "1px solid #fff", borderRadius: "10px" }} onClick={submit}>
          Subscribe
        </button>
      </div>
    );
  };

const { ethers } = require("ethers");
/*
    Welcome to 🏗 scaffold-eth !

    Code:
    https://github.com/scaffold-eth/scaffold-eth

    Support:
    https://t.me/joinchat/KByvmRe5wkR-8F_zz6AjpA
    or DM @austingriffith on twitter or telegram

    You should get your own Alchemy.com & Infura.io ID and put it in `constants.js`
    (this is your connection to the main Ethereum network for ENS etc.)


    🌏 EXTERNAL CONTRACTS:
    You can also bring in contract artifacts in `constants.js`
    (and then use the `useExternalContractLoader()` hook!)
*/

/// 📡 What chain are your contracts deployed to?
const initialNetwork = NETWORKS.polygon; // <------- select your target frontend network (localhost, goerli, xdai, mainnet)

// 😬 Sorry for all the console logging
const DEBUG = true;
const NETWORKCHECK = true;
const USE_BURNER_WALLET = true; // toggle burner wallet feature
const USE_NETWORK_SELECTOR = false;

const web3Modal = Web3ModalSetup();

// 🛰 providers
const providers = [
  "https://eth-mainnet.gateway.pokt.network/v1/lb/611156b4a585a20035148406",
  `https://mainnet.infura.io/v3/${INFURA_ID}`,
  "https://rpc.scaffoldeth.io:48544",
];

function App(props) {
  // specify all the chains your app is available on. Eg: ['localhost', 'mainnet', ...otherNetworks ]
  // reference './constants.js' for other networks
  const networkOptions = [initialNetwork.name, "mainnet", "goerli"];

  const [injectedProvider, setInjectedProvider] = useState();
  const [address, setAddress] = useState();
  const [selectedNetwork, setSelectedNetwork] = useState(networkOptions[0]);
  const location = useLocation();

  const targetNetwork = NETWORKS[selectedNetwork];

  // 🔭 block explorer URL
  const blockExplorer = targetNetwork.blockExplorer;

  // load all your providers
  const localProvider = useStaticJsonRPC([
    process.env.REACT_APP_PROVIDER ? process.env.REACT_APP_PROVIDER : targetNetwork.rpcUrl,
  ]);
  const mainnetProvider = useStaticJsonRPC(providers);

  if (DEBUG) console.log(`Using ${selectedNetwork} network`);

  // 🛰 providers
  if (DEBUG) console.log("📡 Connecting to Mainnet Ethereum");

  const logoutOfWeb3Modal = async () => {
    await web3Modal.clearCachedProvider();
    if (injectedProvider && injectedProvider.provider && typeof injectedProvider.provider.disconnect == "function") {
      await injectedProvider.provider.disconnect();
    }
    setTimeout(() => {
      window.location.reload();
    }, 1);
  };

  /* 💵 This hook will get the price of ETH from 🦄 Uniswap: */
  const price = useExchangeEthPrice(targetNetwork, mainnetProvider);

  /* 🔥 This hook will get the price of Gas from ⛽️ EtherGasStation */
  const gasPrice = useGasPrice(targetNetwork, "fast");
  // Use your injected provider from 🦊 Metamask or if you don't have it then instantly generate a 🔥 burner wallet.
  const userProviderAndSigner = useUserProviderAndSigner(injectedProvider, localProvider, USE_BURNER_WALLET);
  const userSigner = userProviderAndSigner.signer;

  useEffect(() => {
    async function getAddress() {
      if (userSigner) {
        const newAddress = await userSigner.getAddress();
        setAddress(newAddress);
      }
    }
    getAddress();
  }, [userSigner]);

  // You can warn the user if you would like them to be on a specific network
  const localChainId = localProvider && localProvider._network && localProvider._network.chainId;
  const selectedChainId =
    userSigner && userSigner.provider && userSigner.provider._network && userSigner.provider._network.chainId;

  // For more hooks, check out 🔗eth-hooks at: https://www.npmjs.com/package/eth-hooks

  // The transactor wraps transactions and provides notificiations
  const tx = Transactor(userSigner, gasPrice);

  // 🏗 scaffold-eth is full of handy hooks like this one to get your balance:
  const yourLocalBalance = useBalance(localProvider, address);

  // Just plug in different 🛰 providers to get your balance on different chains:
  const yourMainnetBalance = useBalance(mainnetProvider, address);

  // const contractConfig = useContractConfig();

  const contractConfig = { externalContracts: externalContracts };

  // Load in your local 📝 contract and read a value from it:
  const readContracts = useContractLoader(localProvider, contractConfig);

  // If you want to make 🔐 write transactions to your contracts, use the userSigner:
  const writeContracts = useContractLoader(userSigner, localChainId);

  // EXTERNAL CONTRACT EXAMPLE:
  //
  // If you want to bring in the mainnet DAI contract it would look like:
  const mainnetContracts = useContractLoader(mainnetProvider, contractConfig);

  // If you want to call a function on a new block
  useOnBlock(mainnetProvider, () => {
    console.log(`⛓ A new mainnet block is here: ${mainnetProvider._lastBlockNumber}`);
  });

  // Then read your DAI balance like:
  const myMainnetDAIBalance = useContractReader(mainnetContracts, "DAI", "balanceOf", [
    "0x34aA3F359A9D614239015126635CE7732c18fDF3",
  ]);

  // keep track of a variable from the contract in the local React state:
  const purpose = useContractReader(readContracts, "YourContract", "purpose");

  /*
  const addressFromENS = useResolveName(mainnetProvider, "austingriffith.eth");
  console.log("🏷 Resolved austingriffith.eth as:",addressFromENS)
  */

  //
  // 🧫 DEBUG 👨🏻‍🔬
  //
  useEffect(() => {
    if (
      DEBUG &&
      mainnetProvider &&
      address &&
      selectedChainId &&
      yourLocalBalance &&
      yourMainnetBalance &&
      readContracts &&
      writeContracts &&
      mainnetContracts
    ) {
      console.log("_____________________________________ 🏗 scaffold-eth _____________________________________");
      console.log("🌎 mainnetProvider", mainnetProvider);
      console.log("🏠 localChainId", localChainId);
      console.log("👩‍💼 selected address:", address);
      console.log("🕵🏻‍♂️ selectedChainId:", selectedChainId);
      console.log("💵 yourLocalBalance", yourLocalBalance ? ethers.utils.formatEther(yourLocalBalance) : "...");
      console.log("💵 yourMainnetBalance", yourMainnetBalance ? ethers.utils.formatEther(yourMainnetBalance) : "...");
      console.log("📝 readContracts", readContracts);
      console.log("🌍 DAI contract on mainnet:", mainnetContracts);
      console.log("💵 yourMainnetDAIBalance", myMainnetDAIBalance);
      console.log("🔐 writeContracts", writeContracts);
    }
  }, [
    mainnetProvider,
    address,
    selectedChainId,
    yourLocalBalance,
    yourMainnetBalance,
    readContracts,
    writeContracts,
    mainnetContracts,
    localChainId,
    myMainnetDAIBalance,
  ]);

  const loadWeb3Modal = useCallback(async () => {
    const provider = await web3Modal.connect();
    setInjectedProvider(new ethers.providers.Web3Provider(provider));

    provider.on("chainChanged", chainId => {
      console.log(`chain changed to ${chainId}! updating providers`);
      setInjectedProvider(new ethers.providers.Web3Provider(provider));
    });

    provider.on("accountsChanged", () => {
      console.log(`account changed!`);
      setInjectedProvider(new ethers.providers.Web3Provider(provider));
    });

    // Subscribe to session disconnection
    provider.on("disconnect", (code, reason) => {
      console.log(code, reason);
      logoutOfWeb3Modal();
    });
    // eslint-disable-next-line
  }, [setInjectedProvider]);

  useEffect(() => {
    if (web3Modal.cachedProvider) {
      loadWeb3Modal();
    }
  }, [loadWeb3Modal]);

  const [change, setChange] = useState(true);
  const [allPostsData, setAllPosts] = useState(null);
  const [isAuth, setAuth] = useState(false);
  const [single, setSingle] = useState(true);

  function changeContent() {
    setSingle(!single);
  }


  function changeButton() {
    setChange(!change);
  }

  const sendNotification = (type, data) => {
    return notification[type]({
      ...data,
      placement: "bottomRight",
    });
  };

  const builder = imageUrlBuilder(sanityClient);
  function urlFor(source) {
    return builder.image(source);
  }

  useEffect(() => {
    sanityClient
      .fetch(
        `*[_type == "post"] | order(publishedAt desc){
            title,
            slug,
            publishedAt,
            "name": author->name,
            "authorImage": author->image,
            mainImage{
              asset->{
                _id,
                url
              }
            }
          }`,
      )
      .then(data => setAllPosts(data))
      .catch(console.error);
  }, []);

  console.log(allPostsData);

  function search() {
    // Declare variables
    var input, filter, ul, li, a, i, txtValue;
    input = document.getElementById('myInput');
    filter = input.value;
    ul = document.getElementById("myUL");
    li = ul.getElementsByTagName('li');
  
    // Loop through all list items, and hide those who don't match the search query
    for (i = 0; i < li.length; i++) {
      a = li[i].getElementsByTagName("a")[0];
      txtValue = a.textContent || a.innerText;
      if (txtValue.indexOf(filter) > -1) {
        li[i].style.display = "";
      } else {
        li[i].style.display = "none";
      }
    }
  }

  return (
    <div className="App background">

<div className="adSpace2">
  <h6 className="adText2">Your</h6>
  <h6 className="adText2">Ad Here</h6>
</div>

      {/* ✏️ Edit the header and change the title to your project name */}
      <Header>
        {/* 👨‍💼 Your account is in the top right with a wallet at connect options */}
        <div style={{ position: "relative", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", flex: 1 }}>
            {USE_NETWORK_SELECTOR && (
              <div style={{ marginRight: 20 }}>
                <NetworkSwitch
                  networkOptions={networkOptions}
                  selectedNetwork={selectedNetwork}
                  setSelectedNetwork={setSelectedNetwork}
                />
              </div>
            )}
            <Account
              useBurner={USE_BURNER_WALLET}
              address={address}
              localProvider={localProvider}
              userSigner={userSigner}
              mainnetProvider={mainnetProvider}
              price={price}
              web3Modal={web3Modal}
              loadWeb3Modal={loadWeb3Modal}
              logoutOfWeb3Modal={logoutOfWeb3Modal}
              blockExplorer={blockExplorer}
            />
          </div>
        </div>
      </Header>

      {isAuth && (
      <><div className="subscribe">
          <MailchimpSubscribe
            url="https://gmail.us21.list-manage.com/subscribe/post?u=9dac44c0db4dc93dfe2c9fec9&id=d51751ba11"
            render={({ subscribe, status, message }) => (
              <CustomForm
                status={status}
                message={message}
                onValidated={formData => subscribe(formData)} />
            )} />
        </div><div className="editorContainer">
            <a href="https://gmn-sanity.vercel.app/" target="_blank" rel="noreferrer">
              <h6 className="editorText">Editors</h6>
            </a>
          </div></>
      
)}

      <Button         
      style={{
        position: "fixed",
        top: "80px",
        left: "10px",
        display: "block",
        width: "auto",
        cursor: "pointer",
        zIndex: "10"
         }}
         type="default" danger 
         >Buy Bank</Button>

      <div className="p-12" style={{marginBottom: "0px"}}>
      <div className="container mx-auto">

      <img className="flex logo" style={{paddingTop: "100px"}} src={Logo} alt="logo"></img>

      {change ? (
        <Button  type="primary" danger                  
        style={{
          marginBottom: "12px",
          display: "block",
          marginLeft: "auto",
          marginRight: "auto",
          width: "15%",
          minWidth: "175px"
         }}
          onClick={async () => {
            /* look how you call setPurpose on your contract: */
            /* notice how you pass a call back for tx updates too */
            const contract = new ethers.Contract(
              "0xDB7Cb471dd0b49b29CAB4a1C14d070f27216a0Ab",
              [
                { inputs: [], stateMutability: "nonpayable", type: "constructor" },
                {
                  anonymous: false,
                  inputs: [
                    { indexed: true, internalType: "address", name: "owner", type: "address" },
                    { indexed: true, internalType: "address", name: "spender", type: "address" },
                    { indexed: false, internalType: "uint256", name: "value", type: "uint256" },
                  ],
                  name: "Approval",
                  type: "event",
                },
                {
                  anonymous: false,
                  inputs: [
                    { indexed: true, internalType: "address", name: "previousOwner", type: "address" },
                    { indexed: true, internalType: "address", name: "newOwner", type: "address" },
                  ],
                  name: "OwnershipTransferred",
                  type: "event",
                },
                {
                  anonymous: false,
                  inputs: [
                    { indexed: true, internalType: "address", name: "from", type: "address" },
                    { indexed: true, internalType: "address", name: "to", type: "address" },
                    { indexed: false, internalType: "uint256", name: "value", type: "uint256" },
                  ],
                  name: "Transfer",
                  type: "event",
                },
                {
                  inputs: [
                    { internalType: "address", name: "owner", type: "address" },
                    { internalType: "address", name: "spender", type: "address" },
                  ],
                  name: "allowance",
                  outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
                  stateMutability: "view",
                  type: "function",
                },
                {
                  inputs: [
                    { internalType: "address", name: "spender", type: "address" },
                    { internalType: "uint256", name: "amount", type: "uint256" },
                  ],
                  name: "approve",
                  outputs: [{ internalType: "bool", name: "", type: "bool" }],
                  stateMutability: "nonpayable",
                  type: "function",
                },
                {
                  inputs: [{ internalType: "address", name: "account", type: "address" }],
                  name: "balanceOf",
                  outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
                  stateMutability: "view",
                  type: "function",
                },
                {
                  inputs: [],
                  name: "decimals",
                  outputs: [{ internalType: "uint8", name: "", type: "uint8" }],
                  stateMutability: "view",
                  type: "function",
                },
                {
                  inputs: [
                    { internalType: "address", name: "spender", type: "address" },
                    { internalType: "uint256", name: "subtractedValue", type: "uint256" },
                  ],
                  name: "decreaseAllowance",
                  outputs: [{ internalType: "bool", name: "", type: "bool" }],
                  stateMutability: "nonpayable",
                  type: "function",
                },
                {
                  inputs: [
                    { internalType: "address", name: "spender", type: "address" },
                    { internalType: "uint256", name: "addedValue", type: "uint256" },
                  ],
                  name: "increaseAllowance",
                  outputs: [{ internalType: "bool", name: "", type: "bool" }],
                  stateMutability: "nonpayable",
                  type: "function",
                },
                {
                  inputs: [
                    { internalType: "address", name: "to", type: "address" },
                    { internalType: "uint256", name: "amount", type: "uint256" },
                  ],
                  name: "mint",
                  outputs: [],
                  stateMutability: "nonpayable",
                  type: "function",
                },
                {
                  inputs: [],
                  name: "name",
                  outputs: [{ internalType: "string", name: "", type: "string" }],
                  stateMutability: "view",
                  type: "function",
                },
                {
                  inputs: [],
                  name: "owner",
                  outputs: [{ internalType: "address", name: "", type: "address" }],
                  stateMutability: "view",
                  type: "function",
                },
                { inputs: [], name: "renounceOwnership", outputs: [], stateMutability: "nonpayable", type: "function" },
                {
                  inputs: [],
                  name: "symbol",
                  outputs: [{ internalType: "string", name: "", type: "string" }],
                  stateMutability: "view",
                  type: "function",
                },
                {
                  inputs: [],
                  name: "totalSupply",
                  outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
                  stateMutability: "view",
                  type: "function",
                },
                {
                  inputs: [
                    { internalType: "address", name: "to", type: "address" },
                    { internalType: "uint256", name: "amount", type: "uint256" },
                  ],
                  name: "transfer",
                  outputs: [{ internalType: "bool", name: "", type: "bool" }],
                  stateMutability: "nonpayable",
                  type: "function",
                },
                {
                  inputs: [
                    { internalType: "address", name: "from", type: "address" },
                    { internalType: "address", name: "to", type: "address" },
                    { internalType: "uint256", name: "amount", type: "uint256" },
                  ],
                  name: "transferFrom",
                  outputs: [{ internalType: "bool", name: "", type: "bool" }],
                  stateMutability: "nonpayable",
                  type: "function",
                },
                {
                  inputs: [{ internalType: "address", name: "newOwner", type: "address" }],
                  name: "transferOwnership",
                  outputs: [],
                  stateMutability: "nonpayable",
                  type: "function",
                },
              ],
              userSigner,
            );
            const cost = "1000000000000000000";
            const result = tx(contract.approve("0x5f8677d144E564D9eA9cf83Ce52B69ed320df8Ab", cost), update => {
              console.log("📡 Transaction Update:", update);
              if (update && (update.status === "confirmed" || update.status === 1)) {
              
                changeButton();
                sendNotification("success", {
                  message: "Approved",
                  description: `Bank Tokens Approved`,
                });
                console.log(" 🍾 Transaction " + update.hash + " finished!");
                console.log(
                  " ⛽️ " +
                    update.gasUsed +
                    "/" +
                    (update.gasLimit || update.gas) +
                    " @ " +
                    parseFloat(update.gasPrice) / 1000000000 +
                    " gwei",
                );
              }
            });
            console.log("awaiting metamask/web3 confirm result...", result);
            console.log(await result);
          }}
        >
          Approve
        </Button>
      ) : (
        <Button type="primary" danger
        style={{
          marginBottom: "12px",
          display: "block",
          marginLeft: "auto",
          marginRight: "auto",
          width: "15%",
          minWidth: "175px"
         }}
          onClick={async () => {
            /* look how you call setPurpose on your contract: */
            /* notice how you pass a call back for tx updates too */
            const contract = new ethers.Contract(
              "0x5f8677d144E564D9eA9cf83Ce52B69ed320df8Ab",
              [
                {
                  inputs: [{ internalType: "address", name: "_BankToken", type: "address" }],
                  stateMutability: "nonpayable",
                  type: "constructor",
                },
                {
                  anonymous: false,
                  inputs: [
                    { indexed: true, internalType: "address", name: "previousOwner", type: "address" },
                    { indexed: true, internalType: "address", name: "newOwner", type: "address" },
                  ],
                  name: "OwnershipTransferred",
                  type: "event",
                },
                {
                  inputs: [],
                  name: "BankToken",
                  outputs: [{ internalType: "contract IERC20", name: "", type: "address" }],
                  stateMutability: "view",
                  type: "function",
                },
                {
                  inputs: [],
                  name: "cost",
                  outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
                  stateMutability: "view",
                  type: "function",
                },
                {
                  inputs: [],
                  name: "owner",
                  outputs: [{ internalType: "address", name: "", type: "address" }],
                  stateMutability: "view",
                  type: "function",
                },
                { inputs: [], name: "payPerView", outputs: [], stateMutability: "payable", type: "function" },
                { inputs: [], name: "renounceOwnership", outputs: [], stateMutability: "nonpayable", type: "function" },
                {
                  inputs: [{ internalType: "address", name: "newOwner", type: "address" }],
                  name: "transferOwnership",
                  outputs: [],
                  stateMutability: "nonpayable",
                  type: "function",
                },
              ],
              userSigner,
            );
            const tokenContract = new ethers.Contract(
              "0xDB7Cb471dd0b49b29CAB4a1C14d070f27216a0Ab",
              [
                { inputs: [], stateMutability: "nonpayable", type: "constructor" },
                {
                  anonymous: false,
                  inputs: [
                    { indexed: true, internalType: "address", name: "owner", type: "address" },
                    { indexed: true, internalType: "address", name: "spender", type: "address" },
                    { indexed: false, internalType: "uint256", name: "value", type: "uint256" },
                  ],
                  name: "Approval",
                  type: "event",
                },
                {
                  anonymous: false,
                  inputs: [
                    { indexed: true, internalType: "address", name: "previousOwner", type: "address" },
                    { indexed: true, internalType: "address", name: "newOwner", type: "address" },
                  ],
                  name: "OwnershipTransferred",
                  type: "event",
                },
                {
                  anonymous: false,
                  inputs: [
                    { indexed: true, internalType: "address", name: "from", type: "address" },
                    { indexed: true, internalType: "address", name: "to", type: "address" },
                    { indexed: false, internalType: "uint256", name: "value", type: "uint256" },
                  ],
                  name: "Transfer",
                  type: "event",
                },
                {
                  inputs: [
                    { internalType: "address", name: "owner", type: "address" },
                    { internalType: "address", name: "spender", type: "address" },
                  ],
                  name: "allowance",
                  outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
                  stateMutability: "view",
                  type: "function",
                },
                {
                  inputs: [
                    { internalType: "address", name: "spender", type: "address" },
                    { internalType: "uint256", name: "amount", type: "uint256" },
                  ],
                  name: "approve",
                  outputs: [{ internalType: "bool", name: "", type: "bool" }],
                  stateMutability: "nonpayable",
                  type: "function",
                },
                {
                  inputs: [{ internalType: "address", name: "account", type: "address" }],
                  name: "balanceOf",
                  outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
                  stateMutability: "view",
                  type: "function",
                },
                {
                  inputs: [],
                  name: "decimals",
                  outputs: [{ internalType: "uint8", name: "", type: "uint8" }],
                  stateMutability: "view",
                  type: "function",
                },
                {
                  inputs: [
                    { internalType: "address", name: "spender", type: "address" },
                    { internalType: "uint256", name: "subtractedValue", type: "uint256" },
                  ],
                  name: "decreaseAllowance",
                  outputs: [{ internalType: "bool", name: "", type: "bool" }],
                  stateMutability: "nonpayable",
                  type: "function",
                },
                {
                  inputs: [
                    { internalType: "address", name: "spender", type: "address" },
                    { internalType: "uint256", name: "addedValue", type: "uint256" },
                  ],
                  name: "increaseAllowance",
                  outputs: [{ internalType: "bool", name: "", type: "bool" }],
                  stateMutability: "nonpayable",
                  type: "function",
                },
                {
                  inputs: [
                    { internalType: "address", name: "to", type: "address" },
                    { internalType: "uint256", name: "amount", type: "uint256" },
                  ],
                  name: "mint",
                  outputs: [],
                  stateMutability: "nonpayable",
                  type: "function",
                },
                {
                  inputs: [],
                  name: "name",
                  outputs: [{ internalType: "string", name: "", type: "string" }],
                  stateMutability: "view",
                  type: "function",
                },
                {
                  inputs: [],
                  name: "owner",
                  outputs: [{ internalType: "address", name: "", type: "address" }],
                  stateMutability: "view",
                  type: "function",
                },
                { inputs: [], name: "renounceOwnership", outputs: [], stateMutability: "nonpayable", type: "function" },
                {
                  inputs: [],
                  name: "symbol",
                  outputs: [{ internalType: "string", name: "", type: "string" }],
                  stateMutability: "view",
                  type: "function",
                },
                {
                  inputs: [],
                  name: "totalSupply",
                  outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
                  stateMutability: "view",
                  type: "function",
                },
                {
                  inputs: [
                    { internalType: "address", name: "to", type: "address" },
                    { internalType: "uint256", name: "amount", type: "uint256" },
                  ],
                  name: "transfer",
                  outputs: [{ internalType: "bool", name: "", type: "bool" }],
                  stateMutability: "nonpayable",
                  type: "function",
                },
                {
                  inputs: [
                    { internalType: "address", name: "from", type: "address" },
                    { internalType: "address", name: "to", type: "address" },
                    { internalType: "uint256", name: "amount", type: "uint256" },
                  ],
                  name: "transferFrom",
                  outputs: [{ internalType: "bool", name: "", type: "bool" }],
                  stateMutability: "nonpayable",
                  type: "function",
                },
                {
                  inputs: [{ internalType: "address", name: "newOwner", type: "address" }],
                  name: "transferOwnership",
                  outputs: [],
                  stateMutability: "nonpayable",
                  type: "function",
                },
              ],
              userSigner,
            );
            const result = tx(contract.payPerView(), update => {
              console.log("📡 Transaction Update:", update);
              if (update && (update.status === "confirmed" || update.status === 1)) {
                
                setAuth(true);
                changeButton();
                sendNotification("success", {
                  message: "Paid!",
                  description: `You can now view 1 article of your choice.`,
                });
                console.log(" 🍾 Transaction " + update.hash + " finished!");
                console.log(
                  " ⛽️ " +
                    update.gasUsed +
                    "/" +
                    (update.gasLimit || update.gas) +
                    " @ " +
                    parseFloat(update.gasPrice) / 1000000000 +
                    " gwei",
                );
              }
            });
            console.log("awaiting metamask/web3 confirm result...", result);
            console.log(await result);
          }}
        >
          Bank-Per-View
        </Button>
      )}

{isAuth && (
        
        <><input type="text" id="myInput" onKeyUp={search} className="searchBar" placeholder="Search..."></input><div>
            <ul id="myUL">
              {allPostsData &&
                allPostsData.map((post, index) => (
                  <li style={{ display: "none" }}>
                    <Link to={"/" + post.slug.current} key={post.slug.current}>
                      <a onClick={changeContent}>
                        {post.title}
                      </a>
                    </Link>
                  </li>
                ))}
            </ul>
          </div></>
    
        )}

      </div>
      </div>

      {single ? (

      <div className="min-h-screen p-12" style={{zIndex: "1"}}>
      <div className="container mx-auto">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {allPostsData &&
            allPostsData.map((post, index) => (
      
                <span
                  className="block h-64 relative rounded shadow leading-snug bg-black border-l-8 " style={{borderColor: "#313131"}}
                  key={index}
                >
                  <img
                    className="w-full h-full rounded-r object-cover absolute"
                    src={post.mainImage.asset.url}
                    alt=""
                  />
                  <span className="block relative h-full flex justify-start items-start pr-4 pb-4">

                    <h2 className=" text-lg font-bold px-3 py-3 text-red-100 flag">
                      {post.title}
                    </h2>

                    <h6 className=" font-bold px-3 py-3 text-red-100 flag" style={{ position: "absolute", right: "0", bottom: "0"}}>
                     <span> Author:</span> <span> {post.name}</span>
                    </h6>

                    <span>


                   
                    {isAuth && (
                      <Link to={"/" + post.slug.current} key={post.slug.current}>
                        <Button onClick={changeContent} className="view-btn" type="primary" danger style={{position: "absolute", left: "10px", bottom: "10px"}}>view</Button>
                      </Link>
                    )}
                    </span>

                  </span>
                </span>
            ))}

        </div>
      </div>
    </div>

) : (
  <Route component={OnePost} path="/:slug" />

  )}


      <NetworkDisplay
        NETWORKCHECK={NETWORKCHECK}
        localChainId={localChainId}
        selectedChainId={selectedChainId}
        targetNetwork={targetNetwork}
        logoutOfWeb3Modal={logoutOfWeb3Modal}
        USE_NETWORK_SELECTOR={USE_NETWORK_SELECTOR}
      />

      <Switch>

        <Route exact path="/">
          {/* pass in any web3 props to this Home component. For example, yourLocalBalance */}
          <Home yourLocalBalance={yourLocalBalance} readContracts={readContracts} />
        </Route>
        <Route exact path="/debug">
          {/*
                🎛 this scaffolding is full of commonly used components
                this <Contract/> component will automatically parse your ABI
                and give you a form to interact with it locally
            */}

          <Contract
            name="YourContract"
            price={price}
            signer={userSigner}
            provider={localProvider}
            address={address}
            blockExplorer={blockExplorer}
            contractConfig={contractConfig}
          />
        </Route>
        <Route path="/hints">
          <Hints
            address={address}
            yourLocalBalance={yourLocalBalance}
            mainnetProvider={mainnetProvider}
            price={price}
          />
        </Route>
        <Route path="/exampleui">
          <ExampleUI
            address={address}
            userSigner={userSigner}
            mainnetProvider={mainnetProvider}
            localProvider={localProvider}
            yourLocalBalance={yourLocalBalance}
            price={price}
            tx={tx}
            writeContracts={writeContracts}
            readContracts={readContracts}
            purpose={purpose}
          />
        </Route>
        <Route path="/mainnetdai">
          <Contract
            name="DAI"
            customContract={mainnetContracts && mainnetContracts.contracts && mainnetContracts.contracts.DAI}
            signer={userSigner}
            provider={mainnetProvider}
            address={address}
            blockExplorer="https://etherscan.io/"
            contractConfig={contractConfig}
            chainId={1}
          />
          {/*
            <Contract
              name="UNI"
              customContract={mainnetContracts && mainnetContracts.contracts && mainnetContracts.contracts.UNI}
              signer={userSigner}
              provider={mainnetProvider}
              address={address}
              blockExplorer="https://etherscan.io/"
            />
            */}
        </Route>
        <Route path="/subgraph">
          <Subgraph
            subgraphUri={props.subgraphUri}
            tx={tx}
            writeContracts={writeContracts}
            mainnetProvider={mainnetProvider}
          />
        </Route>
      </Switch>
    </div>
  );
}

export default App;
