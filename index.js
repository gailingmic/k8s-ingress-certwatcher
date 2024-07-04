const moment = require('moment');
const tls = require('tls');
const express = require('express');
const k8s = require('@kubernetes/client-node');
const { MemoryCache } = require('./cache');

const app = express();
const port = 3000;

const kc = new k8s.KubeConfig();
kc.loadFromDefault();

const k8sApi = kc.makeApiClient(k8s.NetworkingV1Api);

const cache = new MemoryCache({
  ttl: 60 * 60 * 1000, // 5 Minutes
  update: async () => {
    try {
      const podsRes = await k8sApi.listIngressForAllNamespaces();
      return podsRes.body;
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  },
});

// Please look away now...
process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = 0;
// youre free to look again

const fstring = 'MMM DD HH:mm:ss YYYY z';

const getCertificateDates = async host => {
  return new Promise((resolve, reject) => {
    try {
      let socket = tls.connect({
        port: 443,
        host,
        servername: host,
      }, () => {
        const { validFrom, validTo } = socket.getPeerX509Certificate();
        resolve({ host, validFrom, validTo });
        socket.destroy();
      });

      socket.on('error', (err) => {
        resolve({ host, error: err });
      });
    } catch (err) {
      resolve({ host, error: err });
    }
  });
};

const getCertificateExpiry = async (ingressRes) => {
  const certificates = ingressRes.items.reduce((acc, curr) => {
    if (curr.spec.tls === undefined)
      return acc; 

    const tlsHosts = curr.spec.tls.map(ele => {
      return ele.hosts[0];
    });

    acc = acc.concat(tlsHosts);
    return acc;
  }, [])
    .map(host => getCertificateDates(host));

  const allHosts = (await Promise.allSettled(certificates)).map(ele => {
    let value = ele.value;
    if (value.validTo !== undefined) {
      value.days = moment(value.validTo, fstring).diff(moment(), 'days', true);
    } else {
      value.days = -1;
    }

    return value;
  });

  return allHosts;
};

app.get('/', (req, res) => {
  res.send('Kubernetes Certificate Watcher');
});

app.get('/health', (req, res) => {
  res.status(200).send('Ok');
});

app.get('/certs', async (req, res) => {
  const ingressRes = await cache.read();
  const certs = await getCertificateExpiry(ingressRes);

  if (req.query.text !== undefined)
  {
    return res.send(certs.map(ele => `${ele.host} ${ele.days}`).join('\n'))
  }
  res.json(certs);
});

app.get('/certs/:days', async (req, res) => {
  if (req.params.days === undefined)
    return res.status(400).send('Bad Request');

  try {
    const days = parseInt(req.params.days);
    if (isNaN(days))
      return res.status(500).send('Something went wrong');

    const ingressRes = await cache.read();
    const certs = await getCertificateExpiry(ingressRes);

    if (req.query.text !== undefined)
    {
      return res.send(certs.filter(host => host.days < days).map(ele => `${ele.host} ${ele.days}`).join('\n'))
    }
    res.json(certs.filter(host => host.days < days));
  } catch (err) {
    console.error(err);
    res.status(500).send('Something went wrong');
  }
});

app.listen(port, () => {
  console.log(`Kubernetes Certificate watcher is listening on port ${port}`)
})