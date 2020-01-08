import errors from 'restify-errors'


const getSessionDataFromToken = async ( token, cacheService ) => {
    return await cacheService.read( token.uid )
}

const getPatientById = async ( req, res, cacheService, elasticService, logService ) => {
    try {
        const sessionData = await getSessionDataFromToken( req.token, cacheService )
        const response = await elasticService.searchPatients( sessionData.acl.fhir, [], [ { match: { id: req.params.uid } } ], [] )

        if ( response.hits.total < 1 ) {
            return new errors.NotFoundError()
        }

        await logService.debug( `Elastic getPatientById for ${req.params.uid}` )
        return response.hits.hits[ 0 ]._source
    } catch ( e ) {
        await logService.warning( `Elastic getPatientById ${e.toString()}` )
        return new errors.InternalServerError()
    }
}

const searchPatients = async ( req, res, cacheService, elasticService, logService ) => {
    try {
        const sessionData = await getSessionDataFromToken( req.token, cacheService )
        const params = req.query || req.params || req.body
        const limit = params.size || 25
        const index = ( params.page ? ( params.page - 1 ) : 0 ) * limit

        const response = await elasticService.searchPatients( sessionData.acl.fhir, [], [], [], index, limit )

        await logService.debug( `Elastic searchPatients [${index},${limit}] returns ${response.hits.total} matches` )
        return {
            total: response.hits.total,
            hits: response.hits.hits
        }
    } catch ( e ) {
        await logService.warning( `Elastic searchPatients ${e.toString()}` )
        return new errors.InternalServerError()
    }
}

const searchPatientsByAutoComplete = async ( req, res, cacheService, elasticService, logService ) => {
    try {
        const sessionData = await getSessionDataFromToken( req.token, cacheService )
        const params = req.query || req.params
        const query = params.query
        const type = params.type || 'partial'
        const limit = params.size || 25
        const index = ( params.page ? ( params.page - 1 ) : 0 ) * limit
        const fields = []

        if ( type === 'partial' ) {
            fields.push(
                'id',
                'familyId',
                'specimens.id',
                'identifier.MR',
                'identifier.JHN',
                'name.family',
                'name.given',
                'studies.title'
            )
        }

        const matches = [
            { match_phrase_prefix: { id: query } },
            { match_phrase_prefix: { 'name.family': query } },
            { match_phrase_prefix: { 'name.given': query } },
            { match_phrase_prefix: { 'studies.title': query } },
            { match_phrase_prefix: { 'specimens.id': query } },
            { match_phrase_prefix: { 'identifier.MR': query } },
            { match_phrase_prefix: { 'identifier.JHN': query } },
            { match_phrase_prefix: { familyId: query } },
            { wildcard: { id: `*${query}` } },
            { wildcard: { 'identifier.MR': `*${query}` } },
            { wildcard: { 'identifier.MR': `*${query}` } },
            { wildcard: { 'identifier.JHN': `*${query}` } },
            { wildcard: { familyId: `*${query}` } },
            { fuzzy: { 'name.given': query } },
            { fuzzy: { 'name.family': query } }
        ]

        const response = await elasticService.searchPatients( sessionData.acl.fhir, fields, [], matches, index, limit )

        await logService.debug( `Elastic searchPatientsByAutoComplete using ${params.type}/${params.query} [${index},${limit}] returns ${response.hits.total} matches` )
        return {
            total: response.hits.total,
            hits: response.hits.hits
        }
    } catch ( e ) {
        await logService.warning( `Elastic searchPatientsByAutoComplete ${e.toString()}` )
        return new errors.InternalServerError()
    }
}

export default {
    getPatientById,
    searchPatients,
    searchPatientsByAutoComplete
}
