var localtunnel = require('localtunnel');
var url = require('url');
var CFClient = require('cloudflare');
var dns = require('cloudflare/lib/dns');

// verify all the required env variables are present.
if (!process.env.LOCALTUNNEL_LOCALHOST) throw new Error("LOCALTUNNEL_LOCALHOST required")
if (!process.env.LOCALTUNNEL_PORT) throw new Error("LOCALTUNNEL_PORT required")
if (!process.env.CLOUDFLARE_DOMAIN) throw new Error("CLOUDFLARE_DOMAIN required")
if (!process.env.CLOUDFLARE_DOMAIN_PREFIX) throw new Error("CLOUDFLARE_DOMAIN_PREFIX required")
if (!process.env.CLOUDFLARE_EMAIL) throw new Error("CLOUDFLARE_EMAIL required")
if (!process.env.CLOUDFLARE_KEY) throw new Error("CLOUDFLARE_KEY required")



var tunnel = localtunnel(process.env.LOCALTUNNEL_PORT, function(err, opened_tunnel) {
    if (err) {
        throw err;
    }
    console.log('Tunnel opened!')

    var client = new CFClient({
        email: process.env.CLOUDFLARE_EMAIL,
        key: process.env.CLOUDFLARE_KEY
    });

    var record_name = process.env.CLOUDFLARE_DOMAIN_PREFIX + '.' + process.env.CLOUDFLARE_DOMAIN

    client.browseZones({name:process.env.CLOUDFLARE_DOMAIN})
        .then(function(zone_data){
            return zone_data.result[0].id
        })
        .then(function(zone_id){
            //check if record exists.
            return client.browseDNS(zone_id,{type:'CNAME',name: record_name})
                .then(function(dns_records_data){
                    //determine if we need to delete an existing record.
                    if(dns_records_data.total > 0){
                        console.log('Deleting existing record..');
                        return client.deleteDNS(dns_records_data.result[0])
                    }
                    else{
                        return null
                    }
                })
                .then(function(){
                    //create a new record.
                    var parsed_segments = url.parse(opened_tunnel.url)
                    console.log('Creating new record..', record_name + ' => '+parsed_segments.hostname);

                    return client.addDNS(dns.DNSRecord.create({
                        zoneId: zone_id,
                        type: 'CNAME',
                        name: record_name,
                        content: parsed_segments.hostname
                    }))
                })
        })
        .then(console.log)
        .catch(console.error)



    // the assigned public url for your tunnel
    // i.e. https://abcdefgjhij.localtunnel.me

});

tunnel.on('close', function() {
    // tunnels are closed
    console.error('Tunnel closed!')
});

