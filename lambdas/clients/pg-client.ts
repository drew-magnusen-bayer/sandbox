import { Client } from 'pg';
import { pullConfig, getConfigValue } from './paramstore';

export class DataBaseAccess {
  static client: Client;

  static async createClient() {
    await pullConfig('/set-ingestion');
    const params = {
      user: getConfigValue('/set-ingestion', 'dbUser'),
      host: getConfigValue('/set-ingestion', 'dbHost'),
      password: getConfigValue('/set-ingestion', 'dbPassword'),
      database: getConfigValue('/set-ingestion', 'db'),
      port: 5432
    };

    const newClient = new Client(params);
  
    this.client = newClient;
  }

  static async connectClient() {
    await this.client.connect((err) => {
      if (err) {
        console.error('connection error', err.stack);
      } else {
        console.log('connected');
      }
    });
  }

  static async getSetsForUpdate(offset, limit) {
    try {
      const query = `
      select  distinct(set_id)  
      from seed_operations."attributes" a 
      join seed_operations.plot_bids pb on a.id = pb.attribute_fk 
      where 
        pb.source = 'velocity' AND (
        a."values"  ->>  'plantingYear' = '2024'
         or a."values" ->> 'season' like '%2024%'
         or a."values" ->> 'growingSeasonYear' like '%2024%')
      group by set_id
      order by set_id
      offset $1
      limit $2;`;
      
      const result = await this.client.query(query, [offset, limit]);

      return result.rows;
    } catch (error) {
      console.warn(`Error with getSetsForUpdateWithAttributes. Error: ${error}`);
    }
  }

  static async getPlantingTargets() {
    try {
      const selectSql = `
        SELECT pt.id, al.key, al.type, al.operator, al.valuetype, pta.value, pt.plant_readiness_date, pt.trial_type, pt.updated_at, pt.created_at
        FROM
          seed_operations.planting_targets AS pt
        INNER JOIN seed_operations.planting_target_attributes pta
          ON pt.id = pta.planting_target_fk
        INNER JOIN seed_operations.attribute_lookup al
          on pta.attribute_lookup_fk = al.id`;

      const queryResult = await this.client.query(selectSql);

      return queryResult.rows;
    }
    catch (error) {
      console.warn('Unable to Look up Targets. Error: ', JSON.stringify(error));
    }
  }

  static async updateSetPlantingTargetId(setId, plantingTargetId) {
    try {
      const query = `
      update seed_operations.plot_bids
      set planting_target_fk = $1
      where set_id = $2
      ;`;
      
      await this.client.query(query, [plantingTargetId, setId]);

      return;
    } catch (error) {
      console.warn(`Error with getSetAttributes. Error: ${error}`);
    }
  }  

  static async getStagedSetChunks(QUERY_LIMIT: number) {
    try {
      await this.createClient();
      await this.connectClient();

      const query = `
        SELECT * 
        FROM seed_operations.staged_sets
        WHERE source='velocity' and DATE(updated_at) < DATE(current_date)
        ORDER by set_id
        LIMIT $1
      ;`;
      
      const result = await this.client.query(query, [QUERY_LIMIT]);

      return result.rows;
    } catch (error) {
      console.warn(`Error with getStagedSetsDetails. Error: ${error}`);
    } finally {
      this.client.end();
    }    
  }

  static async getAllStagedSets() {
    try {
      await this.createClient();
      await this.connectClient();

      const query = `
        SELECT * 
        FROM seed_operations.staged_sets
      ;`;
      
      const result = await this.client.query(query);

      return result.rows;
    } catch (error) {
      console.warn(`Error with getStagedSetsDetails. Error: ${error}`);
    } finally {
      this.client.end();
    }    
  }
  static async getEventIngestionReportDetails() {
    try {
      await this.createClient();
      await this.connectClient();

      const query = `select e.event_name, count(*)
      from influx.seed_operations.events e 
      where created_at > current_date - 1 
      group by e.event_name`;
      
      const result = await this.client.query(query);

      return result.rows;
    } catch (error) {
      console.warn(`Error with getEventIngestionReportDetails. Error: ${error}`);
    } finally {
      this.client.end();
    }    
  }

  static async getUnfilledPacketEntryIds() {
    try {
      await this.createClient();
      await this.connectClient();

      const query = `
        SELECT distinct plot_bid  
        FROM seed_operations.plot_bids pb
        INNER JOIN seed_operations."attributes" a
        ON pb.attribute_fk = a.id 
        WHERE a.values->>'planterType' = 'Packet'
        AND pb."source" ='velocity'
        AND pb.plot_bid not in (
         SELECT distinct plot_bid 
         FROM seed_operations.events e 
         WHERE event_type_fk = 26
        )
      `;
      
      const result = await this.client.query(query);

      return result.rows.map((r: {plot_bid: string} )=>(parseInt(r.plot_bid)));
    } catch (error) {
      console.warn(`Error with getUnfilledPacketEntryIds. Error: ${error}`);
    } finally {
      this.client.end();
    }
  }

  static async getSetIdsByMissingEventTypes(eventTypeIds: number[], QUERY_LIMIT: number, offset?: number) {
    try {
      await this.createClient();
      await this.connectClient();

      let query = `
        SELECT distinct pb.set_id 
        FROM seed_operations.durations d 
        INNER JOIN seed_operations.plot_bids pb 
        ON d.plot_bid_fk = pb.id 
        INNER JOIN seed_operations.duration_types dt 
        ON d.duration_type_fk = dt.id 
        WHERE dt.event_from_fk in $1
        AND d.start_event_fk is null
        ORDER BY pb.set_id ASC
        LIMIT $2`;

      const params = [eventTypeIds, QUERY_LIMIT];
      if (offset) {
        query = query + ' OFFSET $3';
        params.push (offset);
      }

      const result = await this.client.query(query, params);

      return result.rows.map((r: {set_id: string} )=>(parseInt(r.set_id)));
    } catch (error) {
      console.warn(`Error with getSetIdsByMissingEventTypes. Error: ${error}`);
    } finally {
      this.client.end();
    }
  }

  static async getMissedEventsBySetAndType(setIds: string[], eventTypeId: number) {
    try {
      await this.createClient();
      await this.connectClient();

      const query = `
          SELECT DISTINCT pb.set_id as "setId", pb.plot_bid as "plotBid", pb.entry_id as "entryId", CAST(dt.event_from_fk AS INT) as "eventTypeId"
          FROM seed_operations.plot_bids pb 
          INNER JOIN seed_operations.events e
          ON pb.id = e.plot_bid_fk 
          INNER JOIN seed_operations.durations d
          ON d.plot_bid_fk = pb.id
          INNER JOIN seed_operations.duration_types dt
          ON d.duration_type_fk = dt.id
          WHERE pb.set_id IN (SELECT * FROM UNNEST($1::text[]))
          AND dt.event_from_fk = $2        
          AND d.start_event_fk is null
      `;
      const result = await this.client.query(query, [setIds, eventTypeId]);
      return result.rows;
    } catch (error) {
      console.warn(`Error with getMissedEntryLevelEventsBySetAndType. Error: ${error}`);
    } finally {
      this.client.end();
    }    
  }

  static async getPlotBidsAndEntryIdsBySetId(setIds: string[]) {
    try {
      await this.createClient();
      await this.connectClient();

      const query = `
          SELECT DISTINCT pb.set_id as "setId", pb.plot_bid as "plotBid", pb.entry_id as "entryId"
          FROM seed_operations.plot_bids pb 
          WHERE pb.set_id IN (SELECT * FROM UNNEST($1::text[]))
      `;
      const result = await this.client.query(query, [setIds]);
      return result.rows;
    } catch (error) {
      console.warn(`Error with getMissedEntryLevelEventsBySetAndType. Error: ${error}`);
    } finally {
      this.client.end();
    }    
  }

  static async getDurationTypesToShift() {
    try {
      await this.createClient();
      await this.connectClient();

      const query = `
        select dt.id, dt.set_attributes
        from seed_operations.duration_types dt 
        left join seed_operations.duration_type_attributes dta 
        on dt.id = dta.duration_type_fk 
        where dta.duration_type_fk is null
        and dt.set_attributes is not null
      `;
      const result = await this.client.query(query);
      return result.rows.map((r: {id: number, set_attributes:any})=> (
        { 
          id: r.id,
          setAttributes: r.set_attributes.attributes
            .map((a:any) => ({key: a.key, value: a.value}))
        }
      ));
    } catch (error) {
      console.warn(`Error with getMissedEntryLevelEventsBySetAndType. Error: ${error}`);
    } finally {
      this.client.end();
    }    
  }
  static async getAttriuteLookupKeyValues() {
    try {
      await this.createClient();
      await this.connectClient();

      const query = `
        select id, key
        from seed_operations.attribute_lookup al 
      `;
      const result = await this.client.query(query);
      return result.rows;
    } catch (error) {
      console.warn(`Error with getMissedEntryLevelEventsBySetAndType. Error: ${error}`);
    } finally {
      this.client.end();
    }    
  }

  static async get2024Sets(offset: number, QUERY_LIMIT: number) {
    try {
      await this.createClient();
      await this.connectClient();

      const query = `
        select set_id
        from seed_operations.sets_pivot_view spv 
        where cast(nullif(spv.planting_year, '') as integer) >= 2024
        order by set_id offset $1
        limit $2
      `;
      const result = await this.client.query(query, [offset, QUERY_LIMIT]);
      return result.rows;
    } catch (error) {
      console.warn(`Error with get2024Sets. Error: ${error}`);
    } finally {
      this.client.end();
    }    
  }
}
