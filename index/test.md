
# 测试用

> 用于各类预构建功能的调试。

<!-- 测试用组件 -->
<Test />

用悬滴法（Pendant Drop method）来测量液体的表面和界面张力已有很长的历史。早在19世纪初Young和Laplace先后发表了二篇有关表面张力现象和本质的文章，把表面张力，$\gamma$，与表面二侧的压力差，$\Delta p$，和表面的曲率半径，$R_1$ 和 $R_2$，联系起来：

$$ \Delta p = \gamma \left( \frac{1}{R_1} + \frac{1}{R_2} \right) \tag{1} $$

19世纪末（1882），Bashforth and Adams在杨-拉普拉斯（Young-Laplace）方程的基础上，基于中心轴对称前提，推导出了描述一处于静力（界面张力对重力）平衡时的悬滴轮廓的方程式（Eq. of Bashforth and Adams）[1]：

$$ 2 - \beta \left( \frac{z}{b} \right) = \frac{1}{R/b} + \frac{\sin\phi}{x/b} \tag{2} $$

上式中（参见图1），$b$ 为悬滴底端（apex）的曲率半径，$R$ 为悬滴轮廓上一点，$p(x, z)$，在纸平面上的主曲率半径（principle radius of curvature），$\phi$ 为轮廓线上点 $p(x, z)$ 处的切线与 $x$ 轴的夹角。 $\beta$ 是体系的Bond number，是衡量重力相对于表面张力的影响力指数，在这里往往也被称为液滴的形状因子（shape/form parameter），因为它的数值直接决定了液滴的形状（注意：是指形状，不涉及液滴的尺寸大小）：

$$ \begin{align} \beta &= \frac{b^2\cdot\Delta\rho\cdot g}{\gamma} = \frac{b^2}{\alpha^2} \tag{3a} \\ \alpha &= \sqrt{\frac{\gamma}{\Delta\rho\cdot g}} \tag{3b} \end{align} $$

$\Delta\rho$ 为液滴相与周围相之间的密度差；$g$ 为重力加速度；$\gamma$ 为表面/界面张力；$\alpha$ 为体系的毛细管常数（capillary constant）。

从上面的方程式可以看出：一个悬滴在达到静力（界面张力对重力）平衡时，其轮廓可通过悬滴底端（apex）的曲率半径，$b$，和液滴的形状因子，$\beta$，来确定。反之也然：若能够确定 $b$ 和 $\beta$，也就确定了悬滴的轮廓。

Bashforth and Adams通过对\eqref{1}式的计算制定出了相应的悬滴轮廓（的近似）数据表，并通过对真实悬滴轮廓的直接测量对获得的数据进行了检验。运用这一表格，原则上就可通过测量一悬滴的轮廓来获得液体的表/界面张力。但基于当时条件的限制，实践使用起来相当不方便。为了简化这一步骤，Andreas等 [2] 在1938年（通过对由水形成的各种形状的悬滴的直接测量）引入了经验较正因子，使得可通过测量悬滴轮廓两极限位置处的尺寸来计算出液体的表/界面张力，也即所谓的Selected-Plane Method（选择平面法或选面法）。Stauffer和Fordham [3，4] 后来通过对 Bashforth-Adams方程的求解准确地获得了这一较正因子，并列成表格。 后来Roe [5] 进一步引入多选择平面法，也即通过测量悬滴轮廓多处极限位置的特征尺寸来提高计算的可靠性和准确性。从那时起悬滴法就成为一经典的表/界面张力测量法。测量通常是通过对液滴拍照，然后通过对照片上液滴几处选择平面位置上尺寸的测量，再通过查表，就可获得表/界面张力的值（当界面两相的密度差已知时）。