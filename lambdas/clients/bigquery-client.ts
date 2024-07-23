import { BigQuery } from "@google-cloud/bigquery";
import { getConfigValue, pullConfig } from "./paramstore";

const getBigQueryCreds = async () => {
  await pullConfig('/csw');
  const bigQueryCreds = await getConfigValue('/csw', 'bigQueryCreds');
  const bigQueryCredsJSON = JSON.parse(bigQueryCreds);
  const bigQueryCredsString = JSON.stringify(bigQueryCredsJSON);
  const bigQueryCredsStringEscaped = bigQueryCredsString.replace(/\n/g, '\\n');
  return JSON.parse(bigQueryCredsStringEscaped);
};

export const getVelocityBqData = async () => {
    try {
        const bigQueryCreds = await getBigQueryCreds();
        const { breeding } = bigQueryCreds.project_ids;
        const bigQueryClient = new BigQuery({ projectId: breeding, credentials: bigQueryCreds });
        const query = `
        SELECT
        DISTINCT
        CAST(i.barcode as STRING) as barcode,
        i.legacyBarcode,
        CAST(i.quantity as INTEGER) as quantity,
        i.uom,
        i.archived,
        le.location_type_name as velocity_location_type,
        le.name as velocity_location,
        CAST(i.barcode as STRING) as fts_barcode,
        mi.is_active as fts_is_active,
        mi.storage_unit_barcode as fts_location
        FROM
          \`bcs-csw-core.velocity.indoor_location_environment\` le,
            UNNEST(le.user_group_ids) as ug
          left outer join \`bcs-csw-core.velocity.inventory\` i on i.locationUUID = le.uuid
          left outer join \`bcs-csw-core.exadata.midas_inventory\` mi on mi.barcode = i.legacyBarcode
        WHERE ug = 'HAZELWOOD-SEED-CENTER'
        AND i.barcode is not null
        ORDER BY le.name asc
        `;
    
        const options = {
          query,
          location: "US"
        };
    
        const [job] = await bigQueryClient.createQueryJob(options);
    
        const [rows] = await job.getQueryResults();
        return rows;
      } catch (error) {
        console.error(error);
        throw error;
      }
}

export const getFtsBqData = async () => {
    try {
        const bigQueryCreds = await getBigQueryCreds();
        const { breeding } = bigQueryCreds.project_ids;
        const bigQueryClient = new BigQuery({ projectId: breeding, credentials: bigQueryCreds });
        const query = `
        SELECT
        DISTINCT
          i.is_active,
          CAST(i.barcode as STRING) as barcode,
          i.quantity,
          i.storage_unit_display_dnml
        FROM \`bcs-csw-core.exadata.midas_inventory\` i
      WHERE i.storage_unit_display_dnml like ('%Hazelwood%')
      AND i.storage_unit_display_dnml not like ('%Discard%')
        `;
    
        const options = {
          query,
          location: "US"
        };
    
        const [job] = await bigQueryClient.createQueryJob(options);
    
        const [rows] = await job.getQueryResults();
        return rows;
      } catch (error) {
        console.error(error);
        throw error;
      }
}
