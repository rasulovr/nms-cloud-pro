import {createClient} from '@supabase/supabase-js'
import {makeHandler} from '../../server/eqaime-api.mjs'
export default makeHandler({createClient,env:process.env})
