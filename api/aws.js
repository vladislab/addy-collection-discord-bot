require('dotenv').config();
const AWS = require('aws-sdk');

// Update our AWS Connection Details
AWS.config.update({
  region: process.env.AWS_DEFAULT_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});
// Create the service used to connect to DynamoDB
const docClient = new AWS.DynamoDB.DocumentClient();
// Setup the parameters required to save to Dynamo
const TableName = process.env.AWS_TABLE_NAME;

function checkValidAddr(addr) {
  if (addr[0] === '0' && addr[1] === 'x' && addr.length === 42) {
    return true;
  } else return false;
}

module.exports = {
  store(whitelistObj, callback) {
    const params = {
      TableName,
      Item: {
        ...whitelistObj,
      },
    };
    docClient.put(params, (error) => {
      if (!error) {
        // Return a message to the user stating that the app was saved
        return callback();
      } else {
        console.error('Unable to save whitelist, err' + error);
      }
    });
  },
  checkWhitelisted(sender, callback) {
    let wl = false;
    let addr = 'No address registered! <a:no:894309088987586641>';

    const params = {
      TableName,
      Key: {
        id: sender,
      },
    };
    docClient.get(params, (err, data) => {
      wl =
        Object.keys(data).length > 0 &&
        !!data['Item'] &&
        !!data['Item']['address'];
      if (wl) addr = data['Item']['address'] + ' <a:yes:894309076895412224>';
      if (err) console.error('Unable to check whitelist record,' + err);
      return callback(addr);
    });
  },
  checkValidAddr,
  verifyAddressWL(senderAddr, callback) {
    if (!checkValidAddr(senderAddr)) {
      return callback(undefined);
    }
    let isWhitelisted = false;
    const params = {
      TableName,
      IndexName: 'address-index',
      KeyConditionExpression: 'address = :var_address',
      ExpressionAttributeValues: { ':var_address': senderAddr },
    };
    console.log(params);
    docClient.query(params, (err, data) => {
      console.log(data);
      isWhitelisted =
        !!data && Object.keys(data).length > 0 && data['Count'] > 0;
      if (err) console.error('Unable to check whitelist record,' + err);
      return callback(isWhitelisted);
    });
  },
};
