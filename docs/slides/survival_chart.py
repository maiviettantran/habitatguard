import matplotlib; matplotlib.use('Agg')
import matplotlib.pyplot as plt
res=['Food','Water','Oxygen','Energy']; now=[24.0,40.0,30.0,35.0]; plan=[29.4,40.0,30.0,29.2]
fig,ax=plt.subplots(figsize=(12,6.8),dpi=200)
fig.patch.set_facecolor('white'); ax.set_facecolor('white')
y=range(len(res)); h=0.36
ink='#0c1124'; sub='#5b6170'
c_now=['#c62828' if v<28 else '#9aa3b5' for v in now]
ax.barh([i-h/2 for i in y],now,h,color=c_now,label='Today')
ax.barh([i+h/2 for i in y],plan,h,color='#2741d6',label='With recovery plan')
for i,(a,b) in enumerate(zip(now,plan)):
    ax.text(a+0.5,i-h/2,f'{a:.1f} d',va='center',fontsize=15,color=ink,fontweight='bold' if a<28 else 'normal')
    ax.text(b+0.5,i+h/2,f'{b:.1f} d',va='center',fontsize=15,color='#2741d6')
ax.axvline(28,color=ink,ls='--',lw=2)
ax.text(28.4,-0.85,'Resupply arrives · day 28',fontsize=14,color=ink,fontweight='bold')
ax.set_yticks(list(y)); ax.set_yticklabels(res,fontsize=18,color=ink); ax.invert_yaxis()
ax.set_xlim(0,46); ax.set_ylim(3.6,-1.1)
ax.set_xlabel('Days the crew can last (crew of 4)',fontsize=14,color=sub,labelpad=6)
ax.tick_params(axis='x',labelsize=13,colors=sub); ax.tick_params(axis='y',length=0)
for s in ['top','right','left']: ax.spines[s].set_visible(False)
ax.spines['bottom'].set_color('#d5d8e0')
from matplotlib.patches import Patch
ax.legend(handles=[Patch(color='#9aa3b5',label='Today'),Patch(color='#c62828',label='Today, short of resupply'),Patch(color='#2741d6',label='With recovery plan')],loc='upper center',bbox_to_anchor=(0.5,-0.13),ncol=3,fontsize=14,frameon=False)
plt.tight_layout(); plt.savefig('survival_chart.png',facecolor='white')
