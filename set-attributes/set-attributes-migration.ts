//join pb's, attributes, and pb_groups
//shape data like:
//set_id, attribute_fk, attribute_values, pbg_values
//for each record
//write set_id, and JSON.parse(pbg_values) to sets table. Track id
//parse set attributes and write to set_attributes table. Use id of record for sets table as sets_fk
//write back sets.id of new record to plot_bids where set_id = the processed set 