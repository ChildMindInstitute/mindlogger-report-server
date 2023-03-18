import axios from "axios";
import crypto from 'crypto'
import {transformApplet} from "./resubmit-responses/json-ld.js";


/**
 * How to get private key:
 * 1. Add this: console.log('PrivateKey', encryptionInfo.getPrivateKey().join());
 * to function onAppletPassword in file: mindlogger-admin/src/Components/Utils/header/header.vue:705
 * 2. Open the applet and click Export Data. See the PrivateKey in the console.
 */
const apiHost = 'https://api-staging.mindlogger.org/api/v1',
    token = 'xxx';
const appletId = 'xxxx';
const privateKey = [];


// const from = '2023-03-17T15:40:00Z'
const from = '2023-02-17T00:00:00Z'
const to = '2023-03-01T00:00:00Z'




async function exportUserData() {
    const appletResponse = await getApplet(appletId);
    const applet = transformApplet(appletResponse);

    const encryptionInfo = getAppletEncryptionInfo({
        prime: applet.encryption.appletPrime,
        baseNumber: applet.encryption.base,
    });
    if (!encryptionInfo.getPublicKey().equals(Buffer.from(applet.encryption.appletPublicKey))) {
        throw new Error('Wrong private key');
    }

    const responsesData = await getUsersData(appletId);

    const encryption = {
        appletPrivateKey: privateKey,
        appletPrime: Array.from(encryptionInfo.getPrime()),
        base: Array.from(encryptionInfo.getGenerator()),
    }
    decryptResponses(responsesData, encryption);
    const filteredResponses = responsesData.responses.filter(response => {
        const created = new Date(response.created)
        const dateFrom = new Date(from);
        const dateTo = new Date(to);
        return !(created < dateFrom || created > dateTo);
    })
    const userTokens = {};
    let currentFlowResponses = {};
    let timestamp = 0;
    for (let i = 0; i < filteredResponses.length; i++) {
        const response = filteredResponses[i];
        mapResponses(response, responsesData.dataSources, currentFlowResponses);
        const activityId = !!response.activity['@id'] ? 'activity/'+response.activity['@id'] : null;
        const flowId = !!response.activityFlow ? 'flow/'+response.activityFlow : null;
        try {
            if (!userTokens[response.userId]) {
                userTokens[response.userId] = await getTokenForUser(response.userId, appletResponse.accountId);
            }
        } catch (e) {
            console.log('Unable to obtain token for user', response.userId, e.message, e);
            continue;
        }
        const userToken = userTokens[response.userId];
        timestamp = timestamp < response.responseCompleted ? response.responseCompleted : timestamp;
        const isFlow = !!response.activityFlow;
        const nextResponse = filteredResponses[i+1];
        const canContinueFlow = isFlow && !!nextResponse && nextResponse.activityFlow === response.activityFlow && nextResponse.userId === response.userId;
        const isNextActivityDuplicated = !!nextResponse && !!Object.keys(currentFlowResponses).find(key => key.includes(nextResponse.activity['@id']));

        if (!isFlow || !canContinueFlow || isNextActivityDuplicated) {
            if (Object.keys(currentFlowResponses).length > 0) {
                try {
                    await sendPDFExport(userToken, applet, applet.activities, {responses: currentFlowResponses}, timestamp, activityId, flowId);
                } catch (e) {
                    console.log('Unable to send pdf report for user', response.userId, e.message, e);
                    continue;
                }
                const activities = [...new Set(Object.keys(currentFlowResponses).map(key => key.split('/')[0]))];
                console.info('Submitted report for', response.MRN, response.userId, 'Flow:', response.activityFlow, 'Activities:', activities);
            }
            currentFlowResponses = {};
            timestamp = 0;
        }
    }
}

function mapResponses(response, dataSources, responsesBuffer) {
    for (const itemId in response.data) {
        const responseRef = response.data[itemId];
        if (!dataSources[responseRef.src] || !dataSources[responseRef.src].data[responseRef.ptr]) {
            continue;
        }
        const itemResponse = dataSources[responseRef.src].data[responseRef.ptr];
        if (!responsesBuffer[itemId]) {
            responsesBuffer[itemId] = [];
        }
        responsesBuffer[itemId].push({
            id: response['_id'],
            activityFlow: response.activityFlow,
            value: itemResponse.value ?? itemResponse,
        });
    }
}


exportUserData().catch(e => {
    console.error(e.message, e);
})

function formatDate(inputDate) {
    let date, month, year;

    date = inputDate.getDate();
    month = inputDate.getMonth() + 1;
    year = inputDate.getFullYear();

    date = date.toString().padStart(2, '0');
    month = month.toString().padStart(2, '0');

    return `${month}/${date}/${year}`;
}

function getApplet(id) {
    let url = `${apiHost}/applet/${id}`;
    return axios({
        method: "get",
        url,
        headers: {
            "Girder-Token": token,
        },
    }).then(resp => resp.data);
}

function getUsersData(appletId, options) {
    return axios({
        method: "get",
        url: `${apiHost}/applet/${appletId}/data`,
        headers: {
            "Girder-Token": token,
        },
        params: {
            ...options,
        },
    }).then(resp => resp.data);
}

function getTokenForUser(profileId) {
    return axios({
        method: "get",
        url: `http://127.0.0.1:8080/api/v1/token/session_for_user/${profileId}`, // /account/${accountId}
        // url: `${apiHost}/applet/${appletId}/data`,
        headers: {
            "Girder-Token": token,
        },
    }).then(resp => resp.data.token);
}

function decryptResponses(data, encryption) {
    /** decrypt data */
    data.AESKeys = [];
    for (let userPublicKey of data.keys) {
        if (userPublicKey) {
            data.AESKeys.push(getAESKey(
                encryption.appletPrivateKey,
                userPublicKey,
                encryption.appletPrime,
                encryption.base
            ));
        } else {
            data.AESKeys.push(null);
        }
    }

    for (let dataSourceName of ['dataSources', 'subScaleSources']) {
        if (!data[dataSourceName]) {
            continue;
        }

        for (let responseId in data[dataSourceName]) {
            const source = data[dataSourceName][responseId];
            try {
                source.data = JSON.parse(decryptData({
                    text: source.data,
                    key: data.AESKeys[source.key]
                }));
            } catch (e) {
                source.data = {};
            }
        }
    }

    if (data.eventSources) {
        for (const events of data.eventSources) {
            if (events.data) {
                events.data = JSON.parse(decryptData({
                    text: events.data,
                    key: data.AESKeys[events.key]
                }))
            }
        }
    }

    if (data.token) {
        data.token.tokens.forEach(change => {
            try {
                change.data = typeof change.data !== 'object' ? JSON.parse(
                    decryptData({
                        text: change.data,
                        key: data.AESKeys[change.key],
                    })
                ) : change.data;
            } catch (e) {
                change.data = []
            }
        })

        data.token.trackers.forEach(tracker => {
            try {
                tracker.data = typeof tracker.data !== 'object' ? JSON.parse(
                    decryptData({
                        text: tracker.data,
                        key: data.AESKeys[tracker.key],
                    })
                ) : tracker.data;
            } catch (e) {
                tracker.data = null
            }
        })

        data.token.trackers = data.token.trackers.filter(tracker => tracker.data)
    }

    return data;
}


function getAppletEncryptionInfo ({ prime, baseNumber }) {
    const key = crypto.createDiffieHellman(
        Buffer.from(prime),
        Buffer.from(baseNumber)
    );

    key.setPrivateKey(Buffer.from(privateKey));
    key.generateKeys();

    return key;
}

function getAESKey ( appletPrivateKey, userPublicKey, appletPrime, base ) {
    const key = crypto.createDiffieHellman(Buffer.from(appletPrime), Buffer.from(base));
    key.setPrivateKey(Buffer.from(appletPrivateKey));

    const secretKey = key.computeSecret(Buffer.from(userPublicKey));

    return crypto.createHash('sha256').update(secretKey).digest();
}


/** decrypt */
const decryptData = ({ text, key }) => {
    let textParts = text.split(':');
    let iv = Buffer.from(textParts.shift(), 'hex');
    let encryptedText = Buffer.from(textParts.join(':'), 'hex');
    let decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key), iv);
    let decrypted = decipher.update(encryptedText);

    try {
        return decrypted.toString() + decipher.final('utf8');
    } catch(error) {
        console.error('Decrypt data failed. Text:', text, 'key:', key, 'error:', error)
        return JSON.stringify([{type: "", time: "", screen: ""}])
    }
}




function sendPDFExport(authToken, applet, activities, appletResponse, timestamp, currentActivityId, flowId = null) {
    const configs = applet.reportConfigs;
    const responses = appletResponse.responses || {};

    if (!configs.serverIp || !configs.publicEncryptionKey || !configs.emailRecipients || !configs.emailRecipients.length) {
        return ;
    }

    const reportActivities = activities.filter(activity => activity.allowExport);

    if (reportActivities.length) {
        const params = [];

        let responseId = null;

        for (const activity of reportActivities) { // &&
            if (!flowId && currentActivityId && currentActivityId !== activity.id) {
                continue;
            }
            params.push({
                activityId: activity.id.split('/').pop(),
                data: activity.items.map(item => {
                    if (!responses[item.schema]) {
                        return null;
                    }
                    const itemResponses = responses[item.schema];
                    for (let i = itemResponses.length-1; i >= 0; i--) {
                        const response = itemResponses[i];
                        if (flowId && response.activityFlow != flowId.split('/').pop()) {
                            continue;
                        }

                        if (response && activity.id == currentActivityId) {
                            responseId = response.id;
                        }

                        return {
                            value: response && (response.value === null || response.value === undefined ? null : response.value)
                        }
                    }

                    return null;
                })
            })
        }
        const encrypted = crypto.publicEncrypt(configs.publicEncryptionKey, Buffer.from(JSON.stringify(params)));
        return exportPDF(
            configs.serverIp,
            authToken,
            encrypted.toString('base64'),
            timestamp,
            applet.id.split('/').pop(),
            flowId && flowId.split('/').pop(),
            currentActivityId.split('/').pop(),
            responseId
        )
    }
}


function exportPDF (serverIP, authToken, responses, timestamp, appletId, activityFlowId, activityId, responseId) {
    const url = serverIP + (serverIP.endsWith('/') ? '' : '/') + 'send-pdf-report';
    // return Promise.resolve();
    return axios({
        method: "post",
        url: url,
        data: {
            responses,
            now: formatDate(new Date(timestamp)),
            timestamp,
        },
        headers: {
            'Content-Type': 'application/json',
            "token": authToken,
        },
        params: { appletId, activityFlowId: activityFlowId ?? 'null', activityId, responseId },
    }).then(resp => resp.data);
}
