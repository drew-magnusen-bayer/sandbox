import { Client } from 'pg';

export class DataBaseAccess {
  static client: Client;

  static async createClient() {
    const params = {
      user: 'catigo',
      host: '10.87.162.5',
      password: '3Ci3zylvE4C1',
      database: 'monrfid',
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

  static async getData() {
    try {
        await this.createClient();
        await this.connectClient();
  
        const query = `
            select box_bid, container_bid, inventory_bid[1]
            from inventory
            where site_code = 'HAZ'
        `;
        
        const result = await this.client.query(query);
  
        return result.rows;
      } catch (error) {
        console.warn(`Error with getSetsForUpdateWithAttributes. Error: ${error}`);
      }
    
  }



}
