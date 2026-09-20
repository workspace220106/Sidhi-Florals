insert into products (name, variety, unit, category, purchase_price, selling_price, stock, supplier) values
  ('Rose','Red','stem','flower',8,15,200,'Ooty Farms'),
  ('Rose','White','stem','flower',8,15,120,'Ooty Farms'),
  ('Rose','Pink','stem','flower',8,15,150,'Ooty Farms'),
  ('Marigold','Orange','kg','flower',60,120,40,'Local Mandi'),
  ('Jasmine','','bunch','flower',40,80,60,'Local Mandi'),
  ('Lily','White','stem','flower',35,70,50,'Bangalore Blooms'),
  ('Tuberose','','stem','flower',6,12,180,'Local Mandi'),
  ('Baby''s Breath','','bunch','flower',50,100,30,'Bangalore Blooms'),
  ('Carnation','Pink','stem','flower',10,22,90,'Bangalore Blooms'),
  ('Chrysanthemum','Yellow','stem','flower',7,14,110,'Local Mandi'),
  ('Wrapping Paper','Kraft','sheet','accessory',10,25,100,'Paper House'),
  ('Satin Ribbon','','piece','accessory',5,15,150,'Paper House'),
  ('Greeting Card','','piece','accessory',8,20,80,'Paper House'),
  ('Red Rose Bouquet','12 stems','piece','bouquet',0,399,0,''),
  ('Mixed Pastel Bouquet','','piece','bouquet',0,549,0,''),
  ('Lily & Rose Bouquet','','piece','bouquet',0,699,0,'');

insert into bouquet_recipes (bouquet_id, component_id, quantity)
select b.id, c.id, r.qty from (values
  ('Red Rose Bouquet','Rose','Red',12),
  ('Red Rose Bouquet','Baby''s Breath','',1),
  ('Red Rose Bouquet','Wrapping Paper','Kraft',1),
  ('Red Rose Bouquet','Satin Ribbon','',1),
  ('Mixed Pastel Bouquet','Rose','Pink',6),
  ('Mixed Pastel Bouquet','Rose','White',6),
  ('Mixed Pastel Bouquet','Carnation','Pink',5),
  ('Mixed Pastel Bouquet','Wrapping Paper','Kraft',1),
  ('Mixed Pastel Bouquet','Satin Ribbon','',1),
  ('Lily & Rose Bouquet','Lily','White',5),
  ('Lily & Rose Bouquet','Rose','Red',8),
  ('Lily & Rose Bouquet','Baby''s Breath','',1),
  ('Lily & Rose Bouquet','Wrapping Paper','Kraft',1),
  ('Lily & Rose Bouquet','Satin Ribbon','',1)
) as r(bname, cname, cvariety, qty)
join products b on b.name = r.bname and b.category = 'bouquet'
join products c on c.name = r.cname and c.variety = r.cvariety and c.category <> 'bouquet';

insert into customers (name, phone, business, address, notes) values
  ('Priya Sharma','9876543210','Priya Events','MG Road, Pune','Prefers pastel arrangements'),
  ('Hotel Sunrise','9123456780','Hotel Sunrise','FC Road, Pune','Weekly lobby flowers');
