import rp from 'request-promise-native'


export default class ElasticClient {

    constructor( config ) {
        this.host = config.host
    }

    async ping() {
        return rp( {
            method: 'GET',
            uri: `${this.host}`,
            json: true
        } )
    }

    generateAcl( acl ) {
        let filters = []

        if ( acl.role === 'practitioner' ) {
            filters.push( { match: { 'practitioners.id': acl.practitioner_id } } )
        } else if ( acl.role === 'genetician' ) {
            filters.push( { match: { 'organization.id': acl.organization_id } } )
        }

        return filters
    }


    async getPatientById( uid, acl ) {
        let filters = this.generateAcl( acl )

        filters.push( { match: { id: uid } } )
        return rp( {
            method: 'GET',
            uri: `${this.host}/patient/_search`,
            json: true,
            body: {
                query: {
                    bool: {
                        must: filters
                    }
                }
            }
        } )
    }

    async getAllPatients( acl ) {
        const filters = this.generateAcl( acl )

        return rp( {
            method: 'GET',
            uri: `${this.host}/patient/_search`,
            json: true,
            query: {
                bool: {
                    must: filters
                }
            }
        } )
    }

}