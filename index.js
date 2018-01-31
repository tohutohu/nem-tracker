// PRIVATE_KEYを設定しています
require('dotenv').config()
const nem = require('nem-sdk').default
let network, networkId;

const testnet = true
if (testnet) {
  network = nem.model.nodes.defaultTestnet
  networkId = nem.model.network.data.testnet.id
}else{
  network = nem.model.nodes.defaultMainnet
  networkId = nem.model.network.data.mainnet.id
}

const endpointSocket = nem.model.objects.create('endpoint')(network, nem.model.nodes.websocketPort)
const connector = nem.com.websockets.connector.create(endpointSocket, '')
const endpoint = nem.model.objects.create('endpoint')(network, nem.model.nodes.defaultPort)

const common = nem.model.objects.create('common')('', process.env.PRIVATE_KEY)
const trackerMosaic = nem.model.objects.create('mosaicAttachment')('tohu', 'tracker_mosaic', 1)
let trackerMosaicDefinition

connector.connect().then(() => {
  nem.com.requests.namespace.mosaicDefinitions(endpoint, 'tohu')
    .then(res => {
      // 作成したモザイクの定義情報を取得します
      trackerMosaicDefinition = res.data[0]
    })
    .catch(err => {
      console.log(err)
    })

  nem.com.websockets.subscribe.chain.blocks(connector, res => {
    console.log('new block added! \nsignature: ' +  res.signature, '\n\n')

    res.transactions.forEach(transaction => {
      if (transaction.amount === 0) {
        return
      }

      const sender = nem.model.address.toAddress(transaction.signer, networkId)
      nem.com.requests.account.mosaics.owned(endpoint, sender)
        .then(data => {
          const mosaics = data.data
          mosaics.forEach(mosaic => {
            if(mosaic.mosaicId.namespaceId === 'tohu' && mosaic.mosaicId.name === 'tracker_mosaic') {
              console.log('発見！！！！！')
              sendTrackerBadge(transaction.recipient)
            }
          })
        })
        .catch(err => {
          console.error(err)
        })
    })
  })
},err => {
  console.log(err)
})

const sendTrackerBadge = address => {
  const transferTransaction = nem.model.objects.create('transferTransaction')(address, 0, 'You are being chased!!')
  transferTransaction.mosaics = [trackerMosaic]
  const transactionEntity = nem.model.transactions.prepare('mosaicTransferTransaction')(common, transferTransaction, trackerMosaicDefinition, networkId)
  transactionEntity.fee = 100000
  nem.model.transactions.send(common, transactionEntity, endpoint)
    .then(res => {
      console.log('モザイクを送信しました')
    })
    .catch(err => {
      console.error(err)
    })
}
