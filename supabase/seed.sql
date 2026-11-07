insert into public.categories (id, slug, name, description, position)
values
  ('monitor', 'monitor', 'Màn hình', 'Sáu mẫu ROG Strix và Swift Pro, từ 310 Hz đến 540 Hz.', 1),
  ('speaker', 'speaker', 'Loa', 'Loa để bàn cho góc máy làm việc và chơi game.', 2),
  ('mouse', 'mouse', 'Chuột', 'Chuột gaming có dây và không dây cho từng kiểu cầm.', 3),
  ('keyboard', 'keyboard', 'Bàn phím', 'Bàn phím cơ với nhiều kích cỡ và loại switch.', 4),
  ('monitor-led', 'monitor-led', 'Đèn màn hình', 'Đèn nền treo sau màn hình, chỉnh màu theo phong cách.', 5)
on conflict (id) do update
set slug = excluded.slug,
    name = excluded.name,
    description = excluded.description,
    position = excluded.position;
