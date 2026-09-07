# florr.io 当前 Wiki 玩法与实现数据
核查日：2026-09-05。以下依据当前 Florr.io Community Wiki 的 Fandom 原始条目（official-florrio.fandom.com），不是旧 florrio.fandom.com、Fantasy Idea 同人条目或开发者代码。搜索缓存显示约2个月前抓取；数处页内侧栏/正文冲突已经标出。可用于 Wiki-inspired 模拟，不应宣称全部是当前服务器精确值。

## 玩家/控制/成长
- 初始：200 HP、25身体伤害；五主槽、五备用槽。主槽4 Basic + 1 Rose，备用第5槽还有1 Basic。来源：[Flower](https://official-florrio.fandom.com/wiki/Flower)、[Basic](https://official-florrio.fandom.com/wiki/Basic)。
- 默认鼠标跟随；可选WASD/箭头。Space/左键展开攻击，Shift/右键收缩防御；Z背包、X天赋、C合成、M地图、Esc设置；R整排主备互换，数字键对应单槽互换。基础花瓣旋转2.5 rad/s，Q/E调速最低为最大30%。来源：[Florr.io](https://official-florrio.fandom.com/wiki/Florr.io)、[Talents](https://official-florrio.fandom.com/wiki/Talents)、[UI](https://official-florrio.fandom.com/wiki/Florr.io_UI)。
- Loadout天赋依次付3/6/9/12/15 TP，解锁6/7/8/9/10槽（非旧版每15级自动加槽）。升级通常+1 TP，尾数5给2 TP，尾数0给10 TP。来源：[Loadout](https://official-florrio.fandom.com/wiki/Talents/Loadout)、[Level](https://official-florrio.fandom.com/wiki/Level)。
- Wiki血量公式 `200 * (243**0.01)**(min(level,75)-1)`，75级约11651 HP，后续不再长基础HP；其段落明确自标过时。身体伤害也长至75级但未找到精确公式。XP需求呈指数增长，未核到当前每级确切阈值。绝对移动速度/花瓣半径也未核实，需作为模拟调参明确隔离。
- Health天赋每阶×1.3，3.5s+1.5s表示先装填3.5秒，然后再等1.5秒激活。装备/换瓣最少2.5秒装填（若本体更长则用更长）；已装备的碎瓣按自身冷却。来源：[Health](https://official-florrio.fandom.com/wiki/Talents/Health)、[Petals](https://official-florrio.fandom.com/wiki/Petals)。

## 花瓣基础值
数字统一为 Common 基准，括号 U 表示该 Common 不可得而 U 是首次可得；秒为装填时间，+后为激活延迟。多数攻击/耐久乘3^rarity，rarity=0 Common。

|名称|基准伤害|基准耐久|装填秒|效果、首次可得|
|---|---:|---:|---|---|
|[Basic](https://official-florrio.fandom.com/wiki/Basic)|10|10|2.5|无特殊；初始Common不能合成，也不常规再掉Common|
|[Rose](https://official-florrio.fandom.com/wiki/Rose)|5|5|3.5+1.5|回7.5HP后消耗重载；攻击时不展开；满血时保持环绕|
|[Light](https://official-florrio.fandom.com/wiki/Light)|13|5|0.75|页侧栏写0.8，正文表写0.75；C/U/R/E/L/M/Ul/S/Et数量1/2/2/3/3/5/5/5/5；总伤害/总血按3^r增长，再均分每个子瓣|
|[Rock](https://official-florrio.fandom.com/wiki/Rock)|22|30|3|攻击半径较短；Et/Unique耐久侧栏196830、正文124659冲突，按通用×3规则会是196830|
|[Stinger](https://official-florrio.fandom.com/wiki/Stinger)|100|1|10|耐久各稀有度均1/子瓣；C-L数量1，M数量3，Ul+数量5；总伤100×3^r均分|
|[Leaf](https://official-florrio.fandom.com/wiki/Leaf)|16|12|1.8|U起；U 48伤36血、回3HP/s，等价Common基准回1HP/s；被动回血|
|[Iris](https://official-florrio.fandom.com/wiki/Iris)|5|5|4|U起；U接触15伤/15血，加210总毒伤持续3秒(70/s)；等价Common毒70/3秒；同源不叠加，毒无视护甲|
|[Faster](https://official-florrio.fandom.com/wiki/Faster)|12|5|2.5|旋转加0.5+0.2×r rad/s，多件叠加|
|[Wing](https://official-florrio.fandom.com/wiki/Wing)|20|10|3|攻击时距离向远处伸再缩回，翅膀自身也旋转|
|[Cactus](https://official-florrio.fandom.com/wiki/Cactus)|7|15|1|每件加30×3^r玩家最大HP；装备/卸下保持当前HP百分比，不白送固定治疗|
|[Missile](https://official-florrio.fandom.com/wiki/Missile)|35|2|1.5+0.5|U起；攻击发射直线，发射前轻微瞄准辅助；未发射近战只有20%伤害|
|[Peas](https://official-florrio.fandom.com/wiki/Peas)|15/粒|5/粒？|1.5+0.5|4粒、四向90°发射且整体方向随机；攻击或防御都发射，射程15 tiles；页表写5(x4)但备注说表内为整体血/每粒四分之一，耐久定义待核|

治疗倍率不是所有等级×3：Common→Mythic为[1,3,9,27,81,243]；Ultra=243√3≈420.89，Super729，Et/Unique729√3≈1262.67。Rose侧栏Common回血8是四舍五入，正文7.5更精确；正文策略残留4.5秒周期与统计表5秒冲突，建议采用统计表。来源：[Rarity](https://official-florrio.fandom.com/wiki/Rarity)。

## 稀有度与合成
- 普通伤害/耐久倍率 C/U/R/E/L/M/Ul/S/Et：[1,3,9,27,81,243,729,2187,6561]，Unique等同Et；Stinger耐久、Light多粒均分等特例不要盲乘。
- 五个相同花瓣/相同稀有度合一个更高阶：目标U/R/E/L/M/Ul/S/Et成功率[0.64,0.32,0.16,0.08,0.04,0.02,0.01,0.001]。成功耗5得1，失败损失1–4瓣，余1–4返还（Wiki期待值隐含均匀失败损失，但正文未直接写均匀）。Square恒100%，Unique是Titan锻造不是普通合成。
- 来源：[Crafting](https://official-florrio.fandom.com/wiki/Crafting)、[Rarity](https://official-florrio.fandom.com/wiki/Rarity)。Eternal于2026-01-19从0.01%改为0.1%，避免抄到旧值。

## 基础怪物
下面皆Common基础。正文表多数遵循血量倍率 `[1,3.75,13.5,54,405,2430,29160,1312200]` (C至S)；侧栏某些怪物L+已改成另一组倍率，存在页内严重冲突。优先保留C-E核实值或明确使用正文的模拟规则，不能将它们当已验证服务器倍率。伤害倍率多数3^r，普通护甲0.8×3^r至Ultra(583.2)，某页显示四舍五入1/2/7等；Super护甲列缺失，不建议杜撰。

|怪物|Common血|身体伤|护甲|XP C/U/R/E/L/M/Ul/S|行为/掉落|
|---|---:|---:|---:|---|---|
|[Ladybug](https://official-florrio.fandom.com/wiki/Ladybug)|62.5|10|0.8|1/1/5/41/378/5200/42400/4700000|C/U被动，R+受击追击；Light+Rose|
|[Baby Ant](https://official-florrio.fandom.com/wiki/Baby_Ant)|25|10|约0.8|1/2/7/57/518/7280/56164/6226562|自然生成均被动，慢速走停；Light/Leaf/Rice；Epic XP侧栏56正文57冲突|
|[Rock mob](https://official-florrio.fandom.com/wiki/Rock_%28Mob%29)|50–100|10|0.8|1/1/2/22/206/3100/19800/2100000|静止；Rock+高阶Heavy，Super低血放小Rock|
|[Bee](https://official-florrio.fandom.com/wiki/Bee)|37.5|50|约0.8|1/1/5/44/405/5870/41079/4495763|C/U被动，R+受击正弦高速追击；Stinger/Pollen/Honey；Ultra XP侧栏41076正文41079|
|[Hornet](https://official-florrio.fandom.com/wiki/Hornet)|62.5|50|0.8|1/1/6/52/486/6900/52300/5800000|远程保持距离、转身发射；Common弹5HP/10伤，弹血每阶×5、弹伤×3；Epic+预判，L+射速增加|
|[Spider](https://official-florrio.fandom.com/wiki/Spider)|62.5|15|0.8|1/1/5/41/378/5300/43200/4900000|靠近自动追击、略快于玩家；毒40总量(15/s)，L+拖网；Faster/Web/Third Eye|
|[Centipede](https://official-florrio.fandom.com/wiki/Centipede)|25/节×10|10/节|0.8/节|1/1/2/14/133/2000/12000/1200000 每节|C-R被动，E+受击追；断节会分成两条；Leaf/Peas|

## 碰撞实现要点
- 花瓣与怪物接触：花瓣给怪物伤害，同时自身扣怪物身体伤害；耐久≤0才碎并冷却，不是任何命中都消失。花瓣耐久更高时能够多次伤害同一目标。玩家本体与怪物接触亦交换身体伤害并有击退。
- 物理伤害 `max(0, damage - armor)`；毒/闪电绕过armor。Iris毒不自叠加；Spider接触施毒但不是花瓣本身扣毒。
- 同一接触的伤害步进间隔、击退系数未核实；如实现0.1/0.2秒接触冷却，应标为模拟参数，而非Wiki精确数字。
- PvE死亡保留背包，检查点复活；PvE不是每人只能抢一份掉落：普通怪通常至少15%输出且输出前4可各自拾取，Super+至少1%且前25。
- 来源：[Petals](https://official-florrio.fandom.com/wiki/Petals)、[Attributes](https://official-florrio.fandom.com/wiki/Attributes)、[Flower](https://official-florrio.fandom.com/wiki/Flower)。

## 实施优先级
核心真实感：鼠标跟随/攻击展开/防御收缩→双排花瓣与真实冷却→碰撞互伤、耐久与护甲→不同怪AI→掉落捡取/库存→5合1含失败返还→XP与TP天赋。绝对坐标、速度、接触冷却和未核实经验阈值作为 `SIMULATION_TUNING`，避免混入 `WIKI_STATS`。


## 实际使用的透明图片素材

以下原始文件原样保留，页面通过 Canvas 的源矩形裁绘透明边距。全部在 2026-09-05 下载并检验。所有已实现生物均使用官方 Wiki 原始图片；图鉴卡片在一次性解码时去除背景，并缓存显示表面，不修改下载源文件。蜈蚣头和身体从同一原图分区取样，因为 Wiki 的独立 Body 文件为空白。

- Basic: [Wiki](https://official-florrio.fandom.com/wiki/Basic) · [原图](https://static.wikia.nocookie.net/official-florrio/images/3/38/TransparentBasic.webp/revision/latest?cb=20230115200231) · SHA-256 `89468dddeec9354394ae773263115d4a947c7bb3ac168eb86eff6a0d3debe97b`
- Light: [Wiki](https://official-florrio.fandom.com/wiki/Light) · [原图](https://static.wikia.nocookie.net/official-florrio/images/d/d8/TransparentLight.webp/revision/latest?cb=20230115202626) · SHA-256 `e0eafea6b33984c97d18b9381256330282840a56630d847dfaa9e35ebdde54c7`
- Rock: [Wiki](https://official-florrio.fandom.com/wiki/Rock) · [原图](https://static.wikia.nocookie.net/official-florrio/images/3/3a/TransparentRock.webp) · SHA-256 `d0ded1402ffb9921b3f9ad82179a8ced5fdf5ee2a12663ee1d9e5ff47fd7f4a9`
- Rose: [Wiki](https://official-florrio.fandom.com/wiki/Rose) · [原图](https://static.wikia.nocookie.net/official-florrio/images/5/57/TransparentRose.webp/revision/latest?cb=20230115202634) · SHA-256 `e956588a89281be76252c6a42a324e38cca4a6488580d0bea40682d16e9eb027`
- Stinger: [Wiki](https://official-florrio.fandom.com/wiki/Stinger) · [原图](https://static.wikia.nocookie.net/official-florrio/images/a/a9/TransparentStinger.webp/revision/latest?cb=20230115202641) · SHA-256 `de5df1eb95942e199a35968496dc5b73c5b7f1be82e8fd31e95ceeeaf7bb0ae2`
- Leaf: [Wiki](https://official-florrio.fandom.com/wiki/Leaf) · [原图](https://static.wikia.nocookie.net/official-florrio/images/1/1c/TransparentLeaf.webp/revision/latest?cb=20230115202625) · SHA-256 `b2370153b8b3baa3ccf3fa0d080dcf9dc861cb4f36b205ddef88e32cd4beebf6`
- Iris: [Wiki](https://official-florrio.fandom.com/wiki/Iris) · [原图](https://static.wikia.nocookie.net/official-florrio/images/a/af/TransparentIris.webp/revision/latest?cb=20230115202624) · SHA-256 `90a4877b5e773c7bfaf5cd4031425fa3b80f3e27bd5c6d230c1a3a5ca04797e9`
- Wing: [Wiki](https://official-florrio.fandom.com/wiki/Wing) · [原图](https://static.wikia.nocookie.net/official-florrio/images/c/c0/TransparentWing.webp) · SHA-256 `54b7fa1091d9958cf26cf2741ec5325c5c3bf4a939adbc56b3c6a4b6b084b5f3`
- Faster: [Wiki](https://official-florrio.fandom.com/wiki/Faster) · [原图](https://static.wikia.nocookie.net/official-florrio/images/6/6a/TransparentFaster.webp/revision/latest?cb=20230115202621) · SHA-256 `dd020bd946c928835fc9d3c330d0ddc84da2f3c068cc5c646ae1ec6cdeb7ac73`
- Cactus: [Wiki](https://official-florrio.fandom.com/wiki/Cactus) · [原图](https://static.wikia.nocookie.net/official-florrio/images/9/93/TransparentCactus.webp/revision/latest?cb=20230115202648) · SHA-256 `e92b548192efbf3ea41064fcc1df2f8214a04a3a2123d73c905fbd8fc1022c1e`
- Bubble: [Wiki](https://official-florrio.fandom.com/wiki/Bubble) · [原图](https://static.wikia.nocookie.net/official-florrio/images/2/2c/TransparentBubble.webp/revision/latest?cb=20230115202647) · SHA-256 `ba8db0c0d27e6459425044fcea65dba0b2b18af4d5ff49d79a51b8b9ae8917f0`
- Missile: [Wiki](https://official-florrio.fandom.com/wiki/Missile) · [原图](https://static.wikia.nocookie.net/official-florrio/images/2/26/TransparentMissile.webp/revision/latest?cb=20230115202628) · SHA-256 `cb1597c111d6b0e802729005de1041c36b5662bbdd13d9eff756961abfb6b344`
- Peas: [Wiki](https://official-florrio.fandom.com/wiki/Peas) · [原图](https://static.wikia.nocookie.net/official-florrio/images/6/65/TransparentPeas.webp/revision/latest?cb=20230115202630) · SHA-256 `66249fc4705b33c76cacb45167f82d9f0a2d6a80d0bd541525d668ddb16b0c2b`
- Bee: [Wiki](https://official-florrio.fandom.com/wiki/Bee) · [原图](https://static.wikia.nocookie.net/official-florrio/images/2/21/Bee2.png/revision/latest?cb=20240126112053) · SHA-256 `6a7135d576ea4ddfff7d8cbb660648a585dea59adf85c9f5f7b06235a7f4a3f3`
- Pollen: [Wiki](https://official-florrio.fandom.com/wiki/Pollen) · [原图](https://static.wikia.nocookie.net/official-florrio/images/a/a5/TransparentPollen.webp/revision/latest?cb=20230115202631) · SHA-256 `290ccdae8e6442490416642192d1f33410dc4dc2eca8ac793918710516321185`
- Sand: [Wiki](https://official-florrio.fandom.com/wiki/Sand) · [原图](https://static.wikia.nocookie.net/official-florrio/images/5/55/TransparentSand.webp/revision/latest?cb=20230115202635) · SHA-256 `6dcba2294ee2ac81477b12affa2613b6b403e7dfdd3833be3e95dfba6849e39a`
- Antennae: [Wiki](https://official-florrio.fandom.com/wiki/Antennae) · [原图](https://static.wikia.nocookie.net/official-florrio/images/4/45/TransparentAntennae.webp/revision/latest?cb=20230115202646) · SHA-256 `a5892287555285848fdd8834d867d7122b97cc7e865637d3223f446c9194e3b9`
- Ladybug: [Wiki](https://florrio.fandom.com/wiki/Ladybug) · [原图](https://static.wikia.nocookie.net/florrio/images/1/1f/LadybugTransparent.png/revision/latest?cb=20200215061113) · SHA-256 `11159b051a03bd437397bacfd4166dbc1f85d66e101cae7e78df376e8f60c118`

字体：Ubuntu Bold，[Google Fonts](https://fonts.google.com/specimen/Ubuntu)。


## 第二轮：全部生物与玩家图片

本轮删除手绘生物后备渲染、免费花瓣练习模式、自定义发现图鉴、重复按钮和状态文案。保留原冒险存档。

- Spider: [官方 Wiki 文件](https://official-florrio.fandom.com/wiki/File:Spider.png) · SHA-256 `6fa451a17a2c2159faebbfb51b95549f3fb588105f709fb1a3cb7a796a0909f5`
- Worker Ant: [官方 Wiki 文件](https://official-florrio.fandom.com/wiki/File:Worker_Ant.png) · SHA-256 `7d134295bac59bcacfc2b59c089c71cd12e12167bf786cb6b56be51b1e93dbe9`
- Soldier Ant: [官方 Wiki 文件](https://official-florrio.fandom.com/wiki/File:Soldier_Ant.png) · SHA-256 `480ec8102a644261fe4aa322398a8257228858347ef6afc189181b970d43ba28`
- Baby Ant: [官方 Wiki 文件](https://official-florrio.fandom.com/wiki/File:Baby_Ant.png) · SHA-256 `c8bc18e019b61a6f2329b92c699fea3c70664f9b03e4793f9dc10e5d21643ff1`
- Centipede: [官方 Wiki 文件](https://official-florrio.fandom.com/wiki/File:Centipede_(Head).png) · SHA-256 `3f9c275e5260cf8bfd2d8f96d0c12b563084747982e1f81e0e78690e9e2e506a`
- Beetle: [官方 Wiki 文件](https://official-florrio.fandom.com/wiki/File:Beetle_(Blank).png) · SHA-256 `4df25c0ae963ff291708f03c7eb20dadff8563c22f564ebd16a4c4adb4245916`
- Scorpion: [官方 Wiki 文件](https://official-florrio.fandom.com/wiki/File:Scorpion_(Common).png) · SHA-256 `b01b9337ed710f2ac786813f8d2def6a22d830af1c142b636cb1c6582579e5a6`
- Jellyfish: [官方 Wiki 文件](https://official-florrio.fandom.com/wiki/File:Jellyfish.png) · SHA-256 `0968b3c5ed799de7fca5cd6da53858580f687af781a1a47feeee7a7eddbe6d40`
- Starfish: [官方 Wiki 文件](https://official-florrio.fandom.com/wiki/File:Starfish_(Mob).png) · SHA-256 `8ee54c143395a6ac162f6d0c9c03de041fffd1833b4391e551bc66da73257e3e`
- Crab: [官方 Wiki 文件](https://official-florrio.fandom.com/wiki/File:Crab2.png) · SHA-256 `3de2c4a5a546649688c6124faf032cdd6028f925fefc84f7a7cb4077bc886bb0`
- Shell: [官方 Wiki 文件](https://official-florrio.fandom.com/wiki/File:Shell_(Mob).png) · SHA-256 `0370188513a40ae91c15e2387153630f04e55dc396179040f102028c70b16f93`
- Sandstorm: [官方 Wiki 文件](https://official-florrio.fandom.com/wiki/File:Sandstorm.png) · SHA-256 `70c8b90ed89c121de3df4eaf7bc3ae68bd4531dbc633cb31adb6823099ac9e97`
- Rock: [官方 Wiki 文件](https://official-florrio.fandom.com/wiki/File:Rock_(Mob).png) · SHA-256 `da4355f5ef71d8cddea88771312492fb8b7e83afe805fcff24d86a166d521f8f`
- Flower: [官方 Wiki 文件](https://official-florrio.fandom.com/wiki/File:Flower.png) · SHA-256 `390135a444a7b90434bb1e40897833c43b1f7020284bec3b0642b20a6d426510`
- Ladybug: [官方 Wiki 文件](https://official-florrio.fandom.com/wiki/File:Ladybug.png) · SHA-256 `60ea2ca9581d62b64253c16bf6f5073fa59022ee88d2c3486a47ee907f8d767a`
